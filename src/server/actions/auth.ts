'use server';

import { eq, or, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { clientUsers, clients, users } from '@/server/db/schema';
import { getDummyHash, hashPassword, needsRehash, passwordProblems, verifyPassword } from '@/server/auth/password';
import { createSession, destroyCurrentSession, markSessionMfaVerified, readSession, revokeAllSessions } from '@/server/auth/session';
import { consumeRateLimit, isLoginThrottled, recordLoginAttempt } from '@/server/auth/throttle';
import { consumeAuthToken, peekAuthToken } from '@/server/auth/tokens';
import { verifyTotp } from '@/server/auth/totp';
import { decryptSecret } from '@/server/security/crypto';
import { audit } from '@/server/audit';
import { getRequestMeta } from '@/server/request';
import { isValidEmail } from '@/lib/email';
import { issueOtp, OTP_ERRORS, verifyOtp } from '@/server/auth/otp';
import { notifySecurity } from '@/server/auth/security-notice';
import type { ActionState } from './types';

const GENERIC_LOGIN_ERROR = 'Incorrect email/username or password.';

/** Only same-site portal paths are accepted as post-login destinations. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/portal/') && !next.startsWith('//') && !next.includes('\\') ? next : '/portal/dashboard';
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const identifier = String(form.get('identifier') ?? '').trim().toLowerCase().slice(0, 254);
  const password = String(form.get('password') ?? '').slice(0, 200);
  if (!identifier || !password) return { error: 'Enter your email/username and password.' };

  const meta = await getRequestMeta();
  if (await isLoginThrottled(identifier, meta.ip)) {
    await audit(null, 'auth.login_blocked', { metadata: { identifier }, meta });
    return { error: 'Too many failed attempts. Please wait 15 minutes and try again, or reset your password.' };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(sql`lower(${users.email})`, identifier), eq(sql`lower(${users.username})`, identifier)))
    .limit(1);

  // Always run a hash comparison so response time doesn't reveal whether the account exists.
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));

  if (!user || !passwordOk) {
    await recordLoginAttempt(identifier, meta.ip, false);
    await audit(user ? { id: user.id, email: user.email } : null, 'auth.login_failed', {
      entityType: 'user',
      entityId: user?.id,
      metadata: { identifier },
      meta,
    });
    return { error: GENERIC_LOGIN_ERROR };
  }

  if (!user.isActive) {
    await recordLoginAttempt(identifier, meta.ip, false);
    return { error: 'This account has been deactivated. Please contact Isha Technologies.' };
  }

  if (user.role === 'client') {
    const [membership] = await db
      .select({ status: clients.status })
      .from(clientUsers)
      .innerJoin(clients, eq(clients.id, clientUsers.clientId))
      .where(eq(clientUsers.userId, user.id))
      .limit(1);
    if (!membership || membership.status === 'inactive') {
      await recordLoginAttempt(identifier, meta.ip, false);
      return { error: 'This client account is not active. Please contact Isha Technologies.' };
    }
  }

  await recordLoginAttempt(identifier, meta.ip, true);
  const updates: Partial<typeof users.$inferInsert> = { lastLoginAt: new Date() };
  if (needsRehash(user.passwordHash!)) updates.passwordHash = await hashPassword(password);
  await db.update(users).set(updates).where(eq(users.id, user.id));

  await createSession(user.id, meta, { mfaVerified: !user.totpEnabled });
  await audit({ id: user.id, email: user.email }, 'auth.login', {
    entityType: 'user',
    entityId: user.id,
    metadata: { mfaRequired: user.totpEnabled },
    meta,
  });

  if (user.totpEnabled) redirect(`/portal/login/verify?next=${encodeURIComponent(safeNext(form.get('next')))}`);
  redirect(safeNext(form.get('next')));
}

export async function verifyMfaAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await readSession();
  if (!session) redirect('/portal/login');
  if (session.mfaVerified) redirect(safeNext(form.get('next')));

  const meta = await getRequestMeta();
  const key = `mfa:${session.user.id}`;
  if (await isLoginThrottled(key, meta.ip)) {
    return { error: 'Too many incorrect codes. Please wait 15 minutes.' };
  }

  const code = String(form.get('code') ?? '').replace(/\s+/g, '');
  const secret = session.user.totpSecretEnc ? decryptSecret(session.user.totpSecretEnc) : null;
  if (!secret || !verifyTotp(secret, code)) {
    await recordLoginAttempt(key, meta.ip, false);
    return { error: 'That code is not valid. Check your authenticator app and try again.' };
  }

  await markSessionMfaVerified(session.sessionId);
  redirect(safeNext(form.get('next')));
}

export async function logoutAction(): Promise<void> {
  const session = await readSession();
  await destroyCurrentSession();
  if (session) {
    await audit({ id: session.user.id, email: session.user.email }, 'auth.logout', {
      entityType: 'user',
      entityId: session.user.id,
    });
  }
  redirect('/portal/login?signed_out=1');
}

const RESET_SENT_MESSAGE = 'If an active account exists for that email, we’ve sent a 6-digit code. It expires in 10 minutes.';

export async function forgotPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase().slice(0, 254);
  if (!isValidEmail(email)) return { fieldErrors: { email: 'Enter a valid email address.' } };

  const meta = await getRequestMeta();
  if (!(await consumeRateLimit('forgot-password', meta.ip, 5, 15 * 60 * 1000))) {
    return { error: 'Too many requests. Please try again in a few minutes.' };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  if (user && user.isActive && user.passwordHash) {
    // Cooldown/limit outcomes are deliberately not surfaced here: the
    // response must be identical whether or not the account exists.
    const r = await issueOtp(user, 'password_reset', meta.ip);
    await audit({ id: user.id, email: user.email }, 'auth.password_reset_requested', { entityType: 'user', entityId: user.id, metadata: { channel: 'email_otp', issued: r.ok }, meta });
  }
  return { ok: true, message: RESET_SENT_MESSAGE, data: { email } };
}

/** Step 2 of forgot-password: email + code + new password. */
export async function resetWithOtpAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase().slice(0, 254);
  const code = String(form.get('code') ?? '');
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  const problem = passwordProblems(password);
  if (problem) return { fieldErrors: { password: problem } };
  if (password !== confirm) return { fieldErrors: { confirm: 'Passwords do not match.' } };

  const meta = await getRequestMeta();
  if (!(await consumeRateLimit('otp-verify', meta.ip, 30, 60 * 60 * 1000))) return { error: 'Too many attempts. Please try again later.' };
  const [user] = await db.select().from(users).where(eq(sql`lower(${users.email})`, email)).limit(1);
  // Unknown / inactive accounts get the same answer as a wrong code.
  if (!user || !user.isActive || !user.passwordHash) return { fieldErrors: { code: OTP_ERRORS.invalid } };
  const v = await verifyOtp(user.id, 'password_reset', code);
  if (!v.ok) return { fieldErrors: { code: OTP_ERRORS[v.reason] } };

  await db.update(users).set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date() }).where(eq(users.id, user.id));
  await revokeAllSessions(user.id);
  await audit({ id: user.id, email: user.email }, 'auth.password_reset', { entityType: 'user', entityId: user.id, metadata: { channel: 'email_otp' }, meta });
  await notifySecurity(user, 'Your password was reset', 'Your portal password was reset and all devices were signed out. If this wasn’t you, contact Isha Technologies immediately.', meta);
  redirect('/portal/login?reset=1');
}

export async function resetPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const token = String(form.get('token') ?? '');
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');

  const problem = passwordProblems(password);
  if (problem) return { fieldErrors: { password: problem } };
  if (password !== confirm) return { fieldErrors: { confirm: 'Passwords do not match.' } };

  const peek = await peekAuthToken(token);
  if (!peek) return { error: 'This link is invalid or has expired. Request a new one.' };

  const consumed = await consumeAuthToken(token);
  if (!consumed) return { error: 'This link has already been used. Request a new one.' };

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date() })
    .where(eq(users.id, consumed.userId));
  await revokeAllSessions(consumed.userId);
  await audit(
    { id: peek.user.id, email: peek.user.email },
    consumed.type === 'invite' ? 'auth.invite_accepted' : 'auth.password_reset',
    { entityType: 'user', entityId: consumed.userId }
  );

  redirect(`/portal/login?${consumed.type === 'invite' ? 'activated' : 'reset'}=1`);
}
