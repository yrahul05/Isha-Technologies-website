'use server';

import { eq, or, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { clientUsers, clients, users } from '@/server/db/schema';
import { getDummyHash, hashPassword, needsRehash, verifyPassword } from '@/server/auth/password';
import { createSession, destroyCurrentSession, markSessionMfaVerified, readSession } from '@/server/auth/session';
import { isLoginThrottled, recordLoginAttempt } from '@/server/auth/throttle';
import { verifyTotp } from '@/server/auth/totp';
import { decryptSecret } from '@/server/security/crypto';
import { audit } from '@/server/audit';
import { CHANGE_PASSWORD_PATH } from '@/server/auth/viewer';
import { getRequestMeta } from '@/server/request';
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
    return { error: 'Too many failed attempts. Please wait 15 minutes and try again, or ask your administrator to reset your password.' };
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
  // An admin-set/reset password must be replaced before anything else is reachable (also enforced server-side in requireViewer).
  if (user.forcePasswordChange) redirect(CHANGE_PASSWORD_PATH);
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
