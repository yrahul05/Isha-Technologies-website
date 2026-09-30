'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { leaveRequests, users } from '@/server/db/schema';
import { assertCan, ForbiddenError, requireViewerOrThrow } from '@/server/auth/viewer';
import { audit } from '@/server/audit';
import { allInternalUserIds, notifyUsers, usersWithPermission } from '@/server/notify';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const requestSchema = z
  .object({
    type: z.enum(['casual', 'sick', 'earned', 'unpaid', 'other']),
    startDate: z.iso.date('Choose a start date.'),
    endDate: z.iso.date('Choose an end date.'),
    reason: z.string().trim().max(1000).default(''),
  })
  .refine((d) => d.endDate >= d.startDate, { path: ['endDate'], message: 'End date must be on or after the start date.' });

export async function requestLeaveAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!viewer.isInternal) throw new ForbiddenError();
    const parsed = parseForm(requestSchema, form);
    if (parsed.error) return parsed.error;
    const [row] = await db.insert(leaveRequests).values({ ...parsed.data, userId: viewer.id }).returning({ id: leaveRequests.id });
    await audit(viewer, 'leave.requested', { entityType: 'leave', entityId: row.id, metadata: parsed.data });
    await notifyUsers(await usersWithPermission('leave.review'), { type: 'leave.requested', title: `Leave request from ${viewer.name}`, body: `${parsed.data.type} · ${parsed.data.startDate} → ${parsed.data.endDate}`, link: '/portal/leave' }, { actorId: viewer.id });
    revalidatePath('/portal/leave');
    return { ok: true, message: 'Leave request submitted.' };
  });
}

export async function reviewLeaveAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'leave.review');
    const parsed = parseForm(z.object({ id: z.uuid(), decision: z.enum(['approved', 'rejected']), note: z.string().trim().max(500).optional(), announce: z.string().optional() }), form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const [req] = await db.select({ l: leaveRequests, name: users.name }).from(leaveRequests).innerJoin(users, eq(users.id, leaveRequests.userId)).where(eq(leaveRequests.id, d.id));
    if (!req || req.l.status !== 'pending') return { error: 'This request has already been reviewed.' };
    if (req.l.userId === viewer.id && !viewer.isSuperAdmin) throw new ForbiddenError('You can’t approve your own leave.');

    await db
      .update(leaveRequests)
      .set({ status: d.decision, reviewedBy: viewer.id, reviewedAt: new Date(), reviewNote: d.note || null })
      .where(and(eq(leaveRequests.id, d.id), eq(leaveRequests.status, 'pending')));
    await audit(viewer, 'leave.reviewed', { entityType: 'leave', entityId: d.id, metadata: { decision: d.decision } });
    await notifyUsers([req.l.userId], { type: 'leave.reviewed', title: `Leave ${d.decision}`, body: `${req.l.startDate} → ${req.l.endDate}${d.note ? ` · ${d.note}` : ''}`, link: '/portal/leave', priority: 'high' }, { actorId: viewer.id });
    // Optional team-wide leave notification (employees only — never clients).
    if (d.decision === 'approved' && d.announce === 'on') {
      await notifyUsers(await allInternalUserIds(), { type: 'announcement.leave', title: `${req.name} is on leave`, body: `${req.l.startDate} → ${req.l.endDate}`, link: '/portal/calendar' }, { actorId: viewer.id });
    }
    revalidatePath('/portal/leave');
    return { ok: true, message: `Leave ${d.decision}.` };
  });
}

export async function cancelLeaveAction(id: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    await db
      .update(leaveRequests)
      .set({ status: 'cancelled' })
      .where(and(eq(leaveRequests.id, id), eq(leaveRequests.userId, viewer.id), eq(leaveRequests.status, 'pending')));
    revalidatePath('/portal/leave');
    return { ok: true };
  });
}
