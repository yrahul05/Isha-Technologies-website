'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { clientUsers, employees, users } from '@/server/db/schema';
import { assertCan, ForbiddenError, requireViewerOrThrow } from '@/server/auth/viewer';
import { revokeAllSessions } from '@/server/auth/session';
import { audit } from '@/server/audit';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

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

// ─── Client logins ───────────────────────────────────────────────────────
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
