import 'server-only';
import { createHmac, randomInt } from 'node:crypto';
import { and, count, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { otpCodes, users } from '@/server/db/schema';
import { safeEqual } from '@/server/security/crypto';
import { consumeRateLimit } from '@/server/auth/throttle';
import { emailConfigured, sendTemplate } from '@/server/email/templates';
import { notifyUsers } from '@/server/notify';
import { audit } from '@/server/audit';

/**
 * Email one-time passwords for sensitive account actions (password reset,
 * password change, email change).
 *
 *  - 6-digit code, 10-minute expiry, single use
 *  - only an HMAC(ENCRYPTION_KEY, id:code) is stored — never the code
 *  - max 5 verification attempts per code
 *  - 60 s resend cooldown, ≤ 5 codes per hour per user+purpose, ≤ 20/hour per IP
 *  - 10 failed verifications in an hour lock OTP for that user for 30 min
 *    and raise a security notification
 *
 * Channel: email. WhatsApp OTP is intentionally not implemented — it needs
 * a configured WhatsApp Business Platform (Cloud API) account, which is a
 * paid, per-conversation service; see docs/portal/SETUP.md for how to add
 * it as a second channel behind the same interface.
 */
export type OtpPurpose = 'password_reset' | 'password_change' | 'email_change';

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60 * 1000;
const MAX_PER_HOUR = 5;
const LOCK_FAILURES = 10;
const LOCK_WINDOW_MS = 60 * 60 * 1000;

function hmac(id: string, code: string): string {
  const raw = process.env.ENCRYPTION_KEY;
  const key = raw ? Buffer.from(raw, 'base64') : Buffer.from('isha-portal-development-only-otp-key');
  return createHmac('sha256', key).update(`${id}:${code}`).digest('hex');
}

const PURPOSE_COPY: Record<OtpPurpose, { title: string; intro: string; category: 'Password Reset' | 'Account Security' }> = {
  password_reset: { title: 'Your password reset code', intro: 'Use this code to reset your Isha Technologies portal password. It expires in 10 minutes.', category: 'Password Reset' },
  password_change: { title: 'Confirm your password change', intro: 'Use this code to confirm the password change you just started. It expires in 10 minutes.', category: 'Account Security' },
  email_change: { title: 'Confirm your new email address', intro: 'Use this code to confirm this address for your Isha Technologies portal account. It expires in 10 minutes.', category: 'Account Security' },
};

export type IssueResult = { ok: true } | { ok: false; reason: 'cooldown' | 'limit' | 'locked' | 'delivery' };

async function isLocked(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ failures: sql<number>`coalesce(sum(${otpCodes.attempts}), 0)::int` })
    .from(otpCodes)
    .where(and(eq(otpCodes.userId, userId), gt(otpCodes.createdAt, new Date(Date.now() - LOCK_WINDOW_MS))));
  return (row?.failures ?? 0) >= LOCK_FAILURES;
}

/** Creates and emails a code. Earlier unused codes for the same purpose are invalidated. */
export async function issueOtp(user: { id: string; email: string; name: string }, purpose: OtpPurpose, ip: string, target = user.email): Promise<IssueResult> {
  if (await isLocked(user.id)) return { ok: false, reason: 'locked' };
  const [last] = await db
    .select({ createdAt: otpCodes.createdAt })
    .from(otpCodes)
    .where(and(eq(otpCodes.userId, user.id), eq(otpCodes.purpose, purpose)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (last && Date.now() - last.createdAt.getTime() < COOLDOWN_MS) return { ok: false, reason: 'cooldown' };
  const [{ n }] = await db
    .select({ n: count() })
    .from(otpCodes)
    .where(and(eq(otpCodes.userId, user.id), eq(otpCodes.purpose, purpose), gt(otpCodes.createdAt, new Date(Date.now() - 60 * 60 * 1000))));
  if (n >= MAX_PER_HOUR) return { ok: false, reason: 'limit' };
  if (!(await consumeRateLimit('otp-issue', ip, 20, 60 * 60 * 1000))) return { ok: false, reason: 'limit' };
  if (process.env.NODE_ENV === 'production' && !emailConfigured()) return { ok: false, reason: 'delivery' };

  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(otpCodes.userId, user.id), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt)));
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const [row] = await db.insert(otpCodes).values({ userId: user.id, purpose, codeHash: 'pending', target, expiresAt: new Date(Date.now() + TTL_MS) }).returning({ id: otpCodes.id });
  await db.update(otpCodes).set({ codeHash: hmac(row.id, code) }).where(eq(otpCodes.id, row.id));

  const copy = PURPOSE_COPY[purpose];
  const sent = await sendTemplate(target, {
    category: copy.category,
    title: copy.title,
    intro: `Hi ${user.name.split(' ')[0]},\n\n${copy.intro}`,
    code,
    footnote: 'Isha Technologies will never ask you for this code. If you didn’t request it, you can ignore this email — your password stays unchanged.',
  });
  if (!sent && process.env.NODE_ENV === 'production') return { ok: false, reason: 'delivery' };
  return { ok: true };
}

/**
 * Verifies and consumes a code. Returns the target the code was sent to
 * (the new address for email_change). Wrong codes count toward the
 * per-code attempt cap and the per-user lockout.
 */
export async function verifyOtp(userId: string, purpose: OtpPurpose, code: string): Promise<{ ok: true; target: string } | { ok: false; reason: 'invalid' | 'locked' }> {
  if (await isLocked(userId)) return { ok: false, reason: 'locked' };
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.userId, userId), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!row) return { ok: false, reason: 'invalid' };
  const clean = code.replace(/\s+/g, '');
  const match = /^\d{6}$/.test(clean) && safeEqual(hmac(row.id, clean), row.codeHash);
  if (!match) {
    const attempts = row.attempts + 1;
    await db
      .update(otpCodes)
      .set({ attempts, ...(attempts >= MAX_ATTEMPTS ? { consumedAt: new Date() } : {}) })
      .where(eq(otpCodes.id, row.id));
    if (await isLocked(userId)) await raiseLockout(userId);
    return { ok: false, reason: 'invalid' };
  }
  // Atomic single use: only one concurrent verification can consume it.
  const consumed = await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(otpCodes.id, row.id), isNull(otpCodes.consumedAt)))
    .returning({ id: otpCodes.id });
  if (consumed.length === 0) return { ok: false, reason: 'invalid' };
  return { ok: true, target: row.target };
}

async function raiseLockout(userId: string) {
  const [u] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId));
  if (!u) return;
  await audit({ id: u.id, email: u.email }, 'auth.login_blocked', { entityType: 'user', entityId: u.id, metadata: { reason: 'otp_lockout' } });
  await notifyUsers([u.id], { type: 'security.otp_lockout', title: 'Too many incorrect verification codes', body: 'Verification is paused for 30 minutes. If this wasn’t you, change your password and contact Isha Technologies.', priority: 'urgent' }, { includeActor: true });
}

export const OTP_ERRORS: Record<string, string> = {
  cooldown: 'Please wait a minute before requesting another code.',
  limit: 'Too many codes requested. Please try again in an hour.',
  locked: 'Too many incorrect codes. Verification is paused for 30 minutes.',
  delivery: 'We couldn’t send the email right now. Please try again later.',
  invalid: 'That code is invalid or has expired.',
};
