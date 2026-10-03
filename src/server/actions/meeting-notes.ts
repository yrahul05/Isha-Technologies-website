'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { meetingActionItems, meetingAttendees, meetings, projectMembers, projects, tasks, users } from '@/server/db/schema';
import { can, ForbiddenError, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { meetingScope } from '@/server/scope';
import { audit, recordActivity } from '@/server/audit';
import { notifyUsers } from '@/server/notify';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const optUuid = z
  .union([z.literal(''), z.uuid()])
  .optional()
  .transform((v) => v || null);

/** Internal people who can see the meeting and organise it, attend it, or manage all meetings may write its notes. */
async function writableMeeting(viewer: Viewer, id: string) {
  if (!viewer.isInternal || !z.uuid().safeParse(id).success) throw new ForbiddenError();
  const [m] = await db.select().from(meetings).where(and(eq(meetings.id, id), meetingScope(viewer)));
  if (!m) throw new ForbiddenError('Meeting not found.');
  if (['requested', 'rejected', 'cancelled'].includes(m.status)) throw new ForbiddenError('Notes can be added once the meeting is scheduled.');
  if (m.organizerId !== viewer.id && !can(viewer, 'meetings.manage')) throw new ForbiddenError('Only the organiser or a meeting manager can edit the notes.');
  return m;
}

const minutesSchema = z.object({
  meetingId: z.uuid(),
  minutes: z.string().max(20000).default(''),
  visibility: z.enum(['internal', 'client']).default('internal'),
});

export async function saveMinutesAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(minutesSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const m = await writableMeeting(viewer, d.meetingId);
    const sharing = d.visibility === 'client' && (m.minutesVisibility !== 'client' || m.minutes !== d.minutes) && d.minutes.trim().length > 0;
    if (d.visibility === 'client' && !m.clientId) return { fieldErrors: { visibility: 'This meeting has no client to share with.' } };
    await db
      .update(meetings)
      .set({ minutes: d.minutes, minutesVisibility: d.visibility, ...(m.status === 'scheduled' && m.startsAt.getTime() < Date.now() ? { status: 'completed' as const } : {}) })
      .where(eq(meetings.id, m.id));
    await audit(viewer, 'meeting.minutes_saved', { entityType: 'meeting', entityId: m.id, metadata: { visibility: d.visibility } });
    if (sharing && m.clientId) {
      const ids = (await db.select({ id: users.id }).from(meetingAttendees).innerJoin(users, eq(users.id, meetingAttendees.userId)).where(and(eq(meetingAttendees.meetingId, m.id), eq(users.role, 'client')))).map((r) => r.id);
      await notifyUsers(ids, { type: 'meeting.minutes', title: `Meeting notes: ${m.title}`, body: 'Minutes and follow-ups are now available.', link: `/portal/meetings/${m.id}` }, { actorId: viewer.id });
    }
    revalidatePath(`/portal/meetings/${m.id}`);
    return { ok: true, message: 'Notes saved.' };
  });
}

const itemSchema = z.object({
  meetingId: z.uuid(),
  title: z.string().trim().min(3, 'Describe the action item.').max(300),
  assigneeId: optUuid,
  dueDate: z
    .union([z.literal(''), z.iso.date()])
    .optional()
    .transform((v) => v || null),
});

export async function addActionItemAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(itemSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const m = await writableMeeting(viewer, d.meetingId);
    if (d.assigneeId) {
      const [u] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, d.assigneeId), ne(users.role, 'client'), eq(users.isActive, true)));
      if (!u) return { fieldErrors: { assigneeId: 'Choose an active team member.' } };
    }
    await db.insert(meetingActionItems).values({ meetingId: m.id, title: d.title, assigneeId: d.assigneeId, dueDate: d.dueDate, createdBy: viewer.id });
    if (d.assigneeId) await notifyUsers([d.assigneeId], { type: 'task.action_item', title: 'Action item from a meeting', body: `${d.title} · ${m.title}`, link: `/portal/meetings/${m.id}`, priority: 'high' }, { actorId: viewer.id });
    revalidatePath(`/portal/meetings/${m.id}`);
    return { ok: true, message: 'Action item added.' };
  });
}

async function itemWithMeeting(viewer: Viewer, itemId: string) {
  if (!z.uuid().safeParse(itemId).success) throw new ForbiddenError();
  const [item] = await db.select().from(meetingActionItems).where(eq(meetingActionItems.id, itemId));
  if (!item) throw new ForbiddenError('Action item not found.');
  const m = await writableMeeting(viewer, item.meetingId);
  return { item, m };
}

export async function toggleActionItemAction(itemId: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const [row] = await db.select().from(meetingActionItems).where(eq(meetingActionItems.id, z.uuid().parse(itemId)));
    if (!row) throw new ForbiddenError('Action item not found.');
    // The assignee may tick off their own item without being able to edit the notes.
    if (row.assigneeId !== viewer.id) await itemWithMeeting(viewer, itemId);
    else if (!viewer.isInternal) throw new ForbiddenError();
    await db.update(meetingActionItems).set({ done: !row.done }).where(eq(meetingActionItems.id, row.id));
    revalidatePath(`/portal/meetings/${row.meetingId}`);
    return { ok: true };
  });
}

export async function deleteActionItemAction(itemId: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const { item } = await itemWithMeeting(viewer, itemId);
    await db.delete(meetingActionItems).where(eq(meetingActionItems.id, item.id));
    revalidatePath(`/portal/meetings/${item.meetingId}`);
    return { ok: true };
  });
}

/** Turn an action item into a real task on the meeting's project (assignee joins the project team if needed). */
export async function promoteActionItemAction(itemId: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const { item, m } = await itemWithMeeting(viewer, itemId);
    if (item.taskId) throw new ForbiddenError('This action item already has a task.');
    if (!m.projectId) throw new ForbiddenError('Link the meeting to a project before creating tasks from it.');
    const [project] = await db.select().from(projects).where(eq(projects.id, m.projectId));
    if (!project) throw new ForbiddenError('Project not found.');
    if (item.assigneeId) {
      const member = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, item.assigneeId)));
      if (member.length === 0) {
        if (!can(viewer, 'projects.manage')) throw new ForbiddenError('That person is not on this project.');
        await db.insert(projectMembers).values({ projectId: project.id, userId: item.assigneeId, memberType: 'team' });
      }
    } else if (!can(viewer, 'tasks.manage') && !(await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, viewer.id)))).length) {
      throw new ForbiddenError('You are not on this project.');
    }
    const [task] = await db
      .insert(tasks)
      .values({ projectId: project.id, title: item.title.slice(0, 200), description: `From meeting “${m.title}”.`, assigneeId: item.assigneeId, reporterId: viewer.id, dueDate: item.dueDate, visibility: 'internal' })
      .returning({ id: tasks.id });
    await db.update(meetingActionItems).set({ taskId: task.id }).where(eq(meetingActionItems.id, item.id));
    await audit(viewer, 'meeting.action_item_promoted', { entityType: 'task', entityId: task.id, metadata: { meetingId: m.id } });
    await recordActivity({ entityType: 'task', entityId: task.id, projectId: project.id, clientId: project.clientId, actorId: viewer.id, summary: `Task “${item.title}” created from meeting “${m.title}”`, visibility: 'internal' });
    if (item.assigneeId) await notifyUsers([item.assigneeId], { type: 'task.assigned', title: 'New task assigned', body: `${item.title} · ${project.name}`, link: `/portal/tasks/${task.id}`, priority: 'high' }, { actorId: viewer.id });
    revalidatePath(`/portal/meetings/${m.id}`);
    revalidatePath('/portal/tasks');
    return { ok: true, message: 'Task created.' };
  });
}
