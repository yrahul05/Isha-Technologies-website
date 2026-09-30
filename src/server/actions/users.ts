'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { clientUsers, clients, employees, users } from '@/server/db/schema';
import { assertCan, ForbiddenError, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { revokeAllSessions } from '@/server/auth/session';
import { issueAuthToken } from '@/server/auth/tokens';
import { deliverAuthEmail } from '@/server/auth/mail';
import { audit, recordActivity } from '@/server/audit';
import { appUrl } from '@/server/request';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

async function emailTaken(email: string, exceptId?: string) {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(sql`lower(${users.email})`, email.toLowerCase())).limit(1);
  return Boolean(row && row.id !== exceptId);
}

/** Issues an invitation, emails it, and returns the link to the admin only when email isn't configured. */
async function sendInvite(user: { id: string; email: string; name: string }, inviter: Viewer): Promise<ActionState['data']> {
  const token = await issueAuthToken(user.id, 'invite');
  const link = `${appUrl()}/portal/accept-invite?token=${encodeURIComponent(token)}`;
  const sent = await deliverAuthEmail(
    user.email,
    'You have been invited to the Isha Technologies portal',
    link,
    'Activate your account',
    `Hi ${user.name.split(' ')[0]},\n\n${inviter.name} has created a portal account for you. Set your password to activate it. This link expires in 7 days.`
  );
  return sent ? { emailed: 'yes' } : { emailed: 'no', link };
}

// ─── Internal team ───────────────────────────────────────────────────────
const teamSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name.').max(120),
  email: z.email('Enter a valid email.').max(254).transform((v) => v.toLowerCase()),
  role: z.enum(['admin', 'employee']),
  title: optionalText(120),
  phone: optionalText(40),
  department: optionalText(80),
  weeklyCapacityHours: z.coerce.number().int().min(0).max(80).default(40),
  skills: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20) : [])),
});

export async function inviteTeamMemberAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'team.manage');
    const parsed = parseForm(teamSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    if (d.role === 'admin' && !viewer.isSuperAdmin) throw new ForbiddenError('Only a Super Admin can create admins.');
    if (await emailTaken(d.email)) return { fieldErrors: { email: 'An account with this email already exists.' } };

    const [user] = await db
      .insert(users)
      .values({ name: d.name, email: d.email, role: d.role, title: d.title, phone: d.phone })
      .returning();
    await db.insert(employees).values({ userId: user.id, department: d.department, designation: d.title, weeklyCapacityHours: d.weeklyCapacityHours, skills: d.skills });
    const data = await sendInvite(user, viewer);
    await audit(viewer, 'user.created', { entityType: 'user', entityId: user.id, metadata: { role: d.role, email: d.email } });
    revalidatePath('/portal/team');
    return { ok: true, message: data?.emailed === 'yes' ? `Invitation emailed to ${d.email}.` : 'Account created. Email is not configured — share the activation link below securely.', data: { ...data, id: user.id } };
  });
}

const updateTeamSchema = teamSchema.omit({ email: true }).extend({
  id: z.uuid(),
  availability: z.enum(['available', 'busy', 'on_leave']).default('available'),
});

export async function updateTeamMemberAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'team.manage');
    const parsed = parseForm(updateTeamSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const [target] = await db.select().from(users).where(eq(users.id, d.id));
    if (!target || target.role === 'client') throw new ForbiddenError();
    if (target.role === 'super_admin' && !viewer.isSuperAdmin) throw new ForbiddenError();
    const roleChange = target.role !== 'super_admin' && target.role !== d.role;
    if (roleChange && !viewer.isSuperAdmin) throw new ForbiddenError('Only a Super Admin can change roles.');

    await db
      .update(users)
      .set({ name: d.name, title: d.title, phone: d.phone, ...(roleChange ? { role: d.role } : {}) })
      .where(eq(users.id, d.id));
    await db
      .insert(employees)
      .values({ userId: d.id, department: d.department, designation: d.title, weeklyCapacityHours: d.weeklyCapacityHours, skills: d.skills, availability: d.availability })
      .onConflictDoUpdate({
        target: employees.userId,
        set: { department: d.department, designation: d.title, weeklyCapacityHours: d.weeklyCapacityHours, skills: d.skills, availability: d.availability },
      });
    if (roleChange) {
      await revokeAllSessions(d.id); // new permissions take effect on next sign-in
      await audit(viewer, 'user.role_changed', { entityType: 'user', entityId: d.id, metadata: { from: target.role, to: d.role } });
    }
    await audit(viewer, 'user.updated', { entityType: 'user', entityId: d.id });
    revalidatePath('/portal/team');
    revalidatePath(`/portal/team/${d.id}`);
    return { ok: true, message: 'Saved.' };
  });
}

/** Activate/deactivate any non-super-admin account. Deactivation revokes sessions immediately. */
export async function setUserActiveAction(userId: string, active: boolean): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!z.uuid().safeParse(userId).success) return { error: 'Invalid user.' };
    if (userId === viewer.id) return { error: 'You cannot deactivate your own account.' };
    const [target] = await db.select().from(users).where(eq(users.id, userId));
    if (!target) return { error: 'User not found.' };
    assertCan(viewer, target.role === 'client' ? 'clients.manage' : 'team.manage');
    if (target.role === 'super_admin' || (target.role === 'admin' && !viewer.isSuperAdmin)) throw new ForbiddenError();

    await db.update(users).set({ isActive: active }).where(eq(users.id, userId));
    if (!active) await revokeAllSessions(userId);
    await audit(viewer, active ? 'user.activated' : 'user.deactivated', { entityType: 'user', entityId: userId });
    revalidatePath('/portal/team');
    revalidatePath('/portal/clients', 'layout');
    return { ok: true, message: active ? 'Account activated.' : 'Account deactivated and signed out everywhere.' };
  });
}

/** Admin-initiated invitation (re)send / password reset link. */
export async function resendInviteAction(userId: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!z.uuid().safeParse(userId).success) return { error: 'Invalid user.' };
    const [target] = await db.select().from(users).where(eq(users.id, userId));
    if (!target) return { error: 'User not found.' };
    assertCan(viewer, target.role === 'client' ? 'clients.manage' : 'team.manage');
    if (target.role === 'super_admin' && !viewer.isSuperAdmin) throw new ForbiddenError();
    const data = await sendInvite(target, viewer);
    await audit(viewer, 'auth.password_reset_requested', { entityType: 'user', entityId: userId, metadata: { initiatedByAdmin: true } });
    return { ok: true, message: data?.emailed === 'yes' ? `Link emailed to ${target.email}.` : 'Email is not configured — share this one-time link securely.', data };
  });
}

// ─── Client logins ───────────────────────────────────────────────────────
const clientLoginSchema = z.object({
  clientId: z.uuid(),
  name: z.string().trim().min(2, 'Enter a name.').max(120),
  email: z.email('Enter a valid email.').max(254).transform((v) => v.toLowerCase()),
  title: optionalText(120),
  phone: optionalText(40),
  role: z.enum(['owner', 'member']).default('member'),
});

export async function createClientLoginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'clients.manage');
    const parsed = parseForm(clientLoginSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const [client] = await db.select().from(clients).where(eq(clients.id, d.clientId));
    if (!client) return { error: 'Client not found.' };
    if (await emailTaken(d.email)) return { fieldErrors: { email: 'An account with this email already exists.' } };

    const [user] = await db.insert(users).values({ name: d.name, email: d.email, role: 'client', title: d.title, phone: d.phone }).returning();
    await db.insert(clientUsers).values({ clientId: client.id, userId: user.id, role: d.role });
    const data = await sendInvite(user, viewer);
    await audit(viewer, 'user.created', { entityType: 'user', entityId: user.id, metadata: { role: 'client', clientId: client.id } });
    await recordActivity({ entityType: 'client', entityId: client.id, clientId: client.id, actorId: viewer.id, summary: `Portal login created for ${d.name}` });
    revalidatePath(`/portal/clients/${client.id}`);
    return { ok: true, message: data?.emailed === 'yes' ? `Invitation emailed to ${d.email}.` : 'Login created. Email is not configured — share the activation link below securely.', data };
  });
}

export async function setClientUserRoleAction(clientId: string, userId: string, role: 'owner' | 'member'): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'clients.manage');
    await db.update(clientUsers).set({ role }).where(and(eq(clientUsers.clientId, clientId), eq(clientUsers.userId, userId)));
    await audit(viewer, 'user.updated', { entityType: 'user', entityId: userId, metadata: { clientRole: role } });
    revalidatePath(`/portal/clients/${clientId}`);
    return { ok: true };
  });
}
