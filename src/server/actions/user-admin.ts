'use server';

import { and, eq, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { clientUsers, clients, employees, sessions, users } from '@/server/db/schema';
import { assertCan, ForbiddenError, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { hashPassword, passwordProblems } from '@/server/auth/password';
import { revokeAllSessions } from '@/server/auth/session';
import { notifySecurity } from '@/server/auth/security-notice';
import { audit, recordActivity } from '@/server/audit';
import { getRequestMeta } from '@/server/request';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

/**
 * Admin-controlled accounts. There is NO self-registration, NO emailed
 * reset link and NO OTP recovery: Super Admin / Admin create accounts with an
 * initial password and set a NEW password when someone forgets theirs.
 * Passwords are scrypt-hashed immediately and are never stored, returned,
 * logged or written to the audit log - an admin can replace a password but
 * can never read the old one.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,31}$/, 'Use 3-32 characters: letters, numbers, dot, dash or underscore.');

/** Only a Super Admin may modify admins; Super Admins are never touched through these actions by an Admin. */
async function loadManageable(viewer: Viewer, userId: string) {
  assertCan(viewer, 'users.manage');
  if (!z.uuid().safeParse(userId).success) throw new ForbiddenError('Invalid user.');
  const [target] = await db.select().from(users).where(eq(users.id, userId));
  if (!target) throw new ForbiddenError('User not found.');
  if (target.role === 'super_admin' && !viewer.isSuperAdmin) throw new ForbiddenError('Only a Super Admin can manage a Super Admin.');
  if (target.role === 'admin' && !viewer.isSuperAdmin) throw new ForbiddenError('Only a Super Admin can manage an Admin.');
  return target;
}

async function identityTaken(email: string, username: string, exceptId?: string) {
  const [e] = await db.select({ id: users.id }).from(users).where(eq(sql`lower(${users.email})`, email.toLowerCase())).limit(1);
  const [u] = await db.select({ id: users.id }).from(users).where(eq(sql`lower(${users.username})`, username.toLowerCase())).limit(1);
  return { email: Boolean(e && e.id !== exceptId), username: Boolean(u && u.id !== exceptId) };
}

function takenErrors(taken: { email: boolean; username: boolean }): ActionState {
  return {
    fieldErrors: {
      ...(taken.email ? { email: 'An account with this email already exists.' } : {}),
      ...(taken.username ? { username: 'That username is taken.' } : {}),
    },
  };
}

const createSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a full name.').max(120),
    username: usernameSchema,
    email: z.email('Enter a valid email.').max(254).transform((v) => v.toLowerCase()),
    phone: optionalText(40),
    role: z.enum(['employee', 'client', 'admin']),
    clientId: z.string().optional(),
    status: z.enum(['active', 'disabled']).default('active'),
    password: z.string().max(200),
    confirm: z.string().max(200),
    forceChange: z.string().optional(),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match.' });

export async function createUserAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let createdId: string | null = null;
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'users.manage');
    const parsed = parseForm(createSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    if (d.role === 'admin' && !viewer.isSuperAdmin) throw new ForbiddenError('Only a Super Admin can create an Admin.');
    const problem = passwordProblems(d.password);
    if (problem) return { fieldErrors: { password: problem } };

    let client: { id: string; companyName: string } | undefined;
    if (d.role === 'client') {
      if (!d.clientId || !z.uuid().safeParse(d.clientId).success) return { fieldErrors: { clientId: 'Choose the client company.' } };
      [client] = await db.select({ id: clients.id, companyName: clients.companyName }).from(clients).where(eq(clients.id, d.clientId));
      if (!client) return { fieldErrors: { clientId: 'Client not found.' } };
    }
    const taken = await identityTaken(d.email, d.username);
    if (taken.email || taken.username) return takenErrors(taken);

    const [user] = await db
      .insert(users)
      .values({
        name: d.name,
        username: d.username,
        email: d.email,
        phone: d.phone,
        role: d.role,
        isActive: d.status === 'active',
        passwordHash: await hashPassword(d.password),
        passwordChangedAt: new Date(),
        forcePasswordChange: d.forceChange === 'on',
      })
      .returning({ id: users.id });
    if (d.role !== 'client') await db.insert(employees).values({ userId: user.id });
    else if (client) await db.insert(clientUsers).values({ clientId: client.id, userId: user.id, role: 'member' });

    await audit(viewer, 'user.created', {
      entityType: 'user',
      entityId: user.id,
      metadata: { role: d.role, username: d.username, email: d.email, active: d.status === 'active', forcePasswordChange: d.forceChange === 'on', ...(client ? { clientId: client.id } : {}) },
    });
    if (client) await recordActivity({ entityType: 'client', entityId: client.id, clientId: client.id, actorId: viewer.id, summary: `Portal login created for ${d.name}` });
    revalidatePath('/portal/users');
    revalidatePath('/portal/team');
    createdId = user.id;
    return { ok: true, message: 'Account created.' };
  });
  // Land on the new user's page (a redirect must happen outside guarded()).
  if (createdId) redirect(`/portal/users/${createdId}?created=1`);
  return result;
}

const resetSchema = z
  .object({
    userId: z.uuid(),
    password: z.string().max(200),
    confirm: z.string().max(200),
    forceChange: z.string().optional(),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match.' });

/** Admin sets/resets a password: they type a NEW one. The previous one is gone for good and unreadable. */
export async function setUserPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(resetSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    if (d.userId === viewer.id) return { error: 'Change your own password from Settings > Security.' };
    const target = await loadManageable(viewer, d.userId);
    const problem = passwordProblems(d.password);
    if (problem) return { fieldErrors: { password: problem } };

    const force = d.forceChange === 'on';
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(d.password), passwordChangedAt: new Date(), forcePasswordChange: force })
      .where(eq(users.id, target.id));
    await revokeAllSessions(target.id); // the old credentials must stop working everywhere, immediately
    const meta = await getRequestMeta();
    await audit(viewer, 'user.password_set_by_admin', { entityType: 'user', entityId: target.id, metadata: { forcePasswordChange: force }, meta });
    await notifySecurity(target, 'Your password was reset by an administrator', 'An administrator set a new password for your account and signed you out of all devices. If you did not ask for this, contact your administrator.', meta);
    revalidatePath(`/portal/users/${target.id}`);
    revalidatePath('/portal/users');
    return { ok: true, message: force ? 'New password set. The user must change it at next sign-in. All their sessions were ended.' : 'New password set. All their sessions were ended.' };
  });
}

/** Form-based (userId + value=1|0) so every control works as a plain server-action form, with or without JavaScript. */
const toggleSchema = z.object({ userId: z.uuid(), value: z.enum(['1', '0']).default('1') });

export async function setForcePasswordChangeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(toggleSchema, form);
    if (parsed.error) return parsed.error;
    const force = parsed.data.value === '1';
    const target = await loadManageable(viewer, parsed.data.userId);
    await db.update(users).set({ forcePasswordChange: force }).where(eq(users.id, target.id));
    await audit(viewer, 'user.force_password_change', { entityType: 'user', entityId: target.id, metadata: { enabled: force } });
    revalidatePath(`/portal/users/${target.id}`);
    revalidatePath('/portal/users');
    return { ok: true, message: force ? 'The user must change their password at next sign-in.' : 'Forced password change turned off.' };
  });
}

export async function setAccountEnabledAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(toggleSchema, form);
    if (parsed.error) return parsed.error;
    const enabled = parsed.data.value === '1';
    if (parsed.data.userId === viewer.id) return { error: 'You cannot disable your own account.' };
    const target = await loadManageable(viewer, parsed.data.userId);
    await db.update(users).set({ isActive: enabled }).where(eq(users.id, target.id));
    if (!enabled) await revokeAllSessions(target.id);
    await audit(viewer, enabled ? 'user.activated' : 'user.deactivated', { entityType: 'user', entityId: target.id });
    revalidatePath(`/portal/users/${target.id}`);
    revalidatePath('/portal/users');
    revalidatePath('/portal/team');
    return { ok: true, message: enabled ? 'Account enabled.' : 'Account disabled and signed out everywhere.' };
  });
}

export async function revokeAccountSessionsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(toggleSchema, form);
    if (parsed.error) return parsed.error;
    const target = await loadManageable(viewer, parsed.data.userId);
    const removed = await db
      .delete(sessions)
      .where(target.id === viewer.id ? and(eq(sessions.userId, target.id), ne(sessions.id, viewer.sessionId)) : eq(sessions.userId, target.id))
      .returning({ id: sessions.id });
    const meta = await getRequestMeta();
    await audit(viewer, 'security.session_revoked', { entityType: 'user', entityId: target.id, metadata: { scope: 'all', count: removed.length }, meta });
    revalidatePath(`/portal/users/${target.id}`);
    return { ok: true, message: removed.length ? `Ended ${removed.length} session${removed.length === 1 ? '' : 's'}.` : 'There were no active sessions.' };
  });
}

const editSchema = z.object({
  userId: z.uuid(),
  name: z.string().trim().min(2, 'Enter a full name.').max(120),
  username: usernameSchema,
  email: z.email('Enter a valid email.').max(254).transform((v) => v.toLowerCase()),
  phone: optionalText(40),
});

export async function updateAccountAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(editSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const target = await loadManageable(viewer, d.userId);
    const taken = await identityTaken(d.email, d.username, target.id);
    if (taken.email || taken.username) return takenErrors(taken);
    const identityChanged = d.email !== target.email.toLowerCase() || d.username !== (target.username ?? '').toLowerCase();
    await db.update(users).set({ name: d.name, username: d.username, email: d.email, phone: d.phone }).where(eq(users.id, target.id));
    if (identityChanged) await revokeAllSessions(target.id);
    await audit(viewer, 'user.updated', { entityType: 'user', entityId: target.id, metadata: { identityChanged } });
    revalidatePath(`/portal/users/${target.id}`);
    revalidatePath('/portal/users');
    return { ok: true, message: 'Saved.' };
  });
}
