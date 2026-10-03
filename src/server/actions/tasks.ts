'use server';

import { and, eq, max, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { projectMembers, projects, taskChecklistItems, taskComments, tasks, users } from '@/server/db/schema';
import { assertCan, can, ForbiddenError, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { canEditTask, findVisibleProject, findVisibleTask, isProjectMember } from '@/server/scope';
import { audit, recordActivity } from '@/server/audit';
import { notifyUsers, projectMemberIds } from '@/server/notify';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const STATUSES = ['todo', 'in_progress', 'review', 'completed', 'blocked'] as const;
type Status = (typeof STATUSES)[number];
const optDate = z
  .union([z.literal(''), z.iso.date()])
  .optional()
  .transform((v) => v || null);
const optUuid = z
  .union([z.literal(''), z.uuid()])
  .optional()
  .transform((v) => v || null);

const taskSchema = z.object({
  projectId: z.uuid('Choose a project.'),
  title: z.string().trim().min(3, 'Add a title.').max(200),
  description: z.string().trim().max(8000).default(''),
  status: z.enum(STATUSES).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigneeId: optUuid,
  dueDate: optDate,
  visibility: z.enum(['internal', 'client']).default('internal'),
  estimateHours: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(0, Math.min(999, Number(v))) || null : null)),
  checklist: z
    .string()
    .optional()
    .transform((v) => (v ? v.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 50) : [])),
});

/** Who may create tasks in a project: task managers, or internal members of that project. */
async function assertCanCreateIn(viewer: Viewer, projectId: string) {
  const project = await findVisibleProject(viewer, projectId);
  if (!project || !viewer.isInternal) throw new ForbiddenError();
  if (!can(viewer, 'tasks.manage') && !(await isProjectMember(viewer, projectId))) throw new ForbiddenError();
  return project;
}

/** Assignees must be active internal users; assigning someone adds them to the project team so they can see it. */
async function resolveAssignee(viewer: Viewer, projectId: string, assigneeId: string | null) {
  if (!assigneeId) return null;
  const [u] = await db.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.id, assigneeId), ne(users.role, 'client'), eq(users.isActive, true)));
  if (!u) throw new ForbiddenError('Tasks can only be assigned to active team members.');
  const member = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, assigneeId)));
  if (member.length === 0) {
    if (!can(viewer, 'projects.manage')) throw new ForbiddenError('That person is not on this project.');
    await db.insert(projectMembers).values({ projectId, userId: assigneeId, memberType: 'team' });
  }
  return u;
}

export async function createTaskAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(taskSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const project = await assertCanCreateIn(viewer, d.projectId);
    const assignee = await resolveAssignee(viewer, d.projectId, d.assigneeId);
    const [{ pos }] = await db.select({ pos: max(tasks.position) }).from(tasks).where(eq(tasks.projectId, d.projectId));

    const [task] = await db
      .insert(tasks)
      .values({
        projectId: d.projectId,
        title: d.title,
        description: d.description,
        status: d.status,
        priority: d.priority,
        assigneeId: assignee?.id ?? null,
        reporterId: viewer.id,
        dueDate: d.dueDate,
        visibility: d.visibility,
        estimateHours: d.estimateHours,
        position: (pos ?? 0) + 1,
        completedAt: d.status === 'completed' ? new Date() : null,
      })
      .returning();
    if (d.checklist.length) await db.insert(taskChecklistItems).values(d.checklist.map((label, i) => ({ taskId: task.id, label, position: i })));

    await audit(viewer, 'task.created', { entityType: 'task', entityId: task.id, metadata: { projectId: d.projectId } });
    if (assignee) {
      await audit(viewer, 'task.assigned', { entityType: 'task', entityId: task.id, metadata: { assigneeId: assignee.id } });
      await notifyUsers([assignee.id], { type: 'task.assigned', title: 'New task assigned', body: `${task.title} · ${project.name}`, link: `/portal/tasks/${task.id}`, priority: 'high' }, { actorId: viewer.id });
    }
    await recordActivity({ entityType: 'task', entityId: task.id, projectId: project.id, clientId: project.clientId, actorId: viewer.id, summary: `Task “${task.title}” created`, visibility: task.visibility });
    revalidatePath('/portal/tasks');
    revalidatePath(`/portal/projects/${project.id}`);
    return { ok: true, message: 'Task created.', data: { id: task.id } };
  });
}

const updateSchema = taskSchema.omit({ projectId: true, checklist: true }).extend({ id: z.uuid() });

export async function updateTaskAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(updateSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const task = await findVisibleTask(viewer, d.id);
    if (!task || !(await canEditTask(viewer, task))) throw new ForbiddenError();
    const assignee = d.assigneeId !== task.assigneeId ? await resolveAssignee(viewer, task.projectId, d.assigneeId) : undefined;

    await db
      .update(tasks)
      .set({
        title: d.title,
        description: d.description,
        status: d.status,
        priority: d.priority,
        assigneeId: d.assigneeId,
        dueDate: d.dueDate,
        visibility: d.visibility,
        estimateHours: d.estimateHours,
        completedAt: d.status === 'completed' ? (task.completedAt ?? new Date()) : null,
      })
      .where(eq(tasks.id, d.id));
    await audit(viewer, 'task.updated', { entityType: 'task', entityId: d.id });
    if (assignee) {
      await audit(viewer, 'task.assigned', { entityType: 'task', entityId: d.id, metadata: { assigneeId: assignee.id } });
      await notifyUsers([assignee.id], { type: 'task.assigned', title: 'Task assigned to you', body: d.title, link: `/portal/tasks/${d.id}`, priority: 'high' }, { actorId: viewer.id });
    }
    if (task.status !== d.status) await statusSideEffects(viewer, task, d.status, d.visibility);
    revalidatePath(`/portal/tasks/${d.id}`);
    revalidatePath('/portal/tasks');
    return { ok: true, message: 'Task saved.' };
  });
}

/** Kanban move / quick status change. */
export async function setTaskStatusAction(taskId: string, status: Status): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!z.uuid().safeParse(taskId).success || !STATUSES.includes(status)) return { error: 'Invalid request.' };
    const task = await findVisibleTask(viewer, taskId);
    if (!task || !(await canEditTask(viewer, task))) throw new ForbiddenError('You can’t change this task.');
    if (task.status === status) return { ok: true };
    await db
      .update(tasks)
      .set({ status, completedAt: status === 'completed' ? new Date() : null })
      .where(eq(tasks.id, taskId));
    await audit(viewer, 'task.updated', { entityType: 'task', entityId: taskId, metadata: { status } });
    await statusSideEffects(viewer, task, status, task.visibility);
    revalidatePath('/portal/tasks');
    revalidatePath(`/portal/projects/${task.projectId}`);
    return { ok: true };
  });
}

async function statusSideEffects(viewer: Viewer, task: typeof tasks.$inferSelect, status: Status, vis: 'internal' | 'client') {
  const [project] = await db.select({ id: projects.id, clientId: projects.clientId, name: projects.name }).from(projects).where(eq(projects.id, task.projectId));
  const label = status.replace('_', ' ');
  await recordActivity({
    entityType: 'task',
    entityId: task.id,
    projectId: task.projectId,
    clientId: project.clientId,
    actorId: viewer.id,
    summary: status === 'completed' ? `Completed “${task.title}”` : `Moved “${task.title}” to ${label}`,
    visibility: vis,
  });
  if (status === 'review' || status === 'completed' || status === 'blocked') {
    const notify = [task.reporterId, task.assigneeId];
    if (vis === 'client' && status === 'completed') notify.push(...(await projectMemberIds(task.projectId, 'client')));
    await notifyUsers(notify, { type: 'task.status', title: `Task ${label}`, body: `${task.title} · ${project.name}`, link: `/portal/tasks/${task.id}`, priority: status === 'blocked' ? 'high' : 'normal' }, { actorId: viewer.id });
  }
}

// ─── Lifecycle: active → completed → archived; soft delete; Super Admin purge ──
/** Snapshot kept in the audit log whenever a task leaves the active list. */
function snapshot(t: typeof tasks.$inferSelect) {
  return { title: t.title, projectId: t.projectId, status: t.status, assigneeId: t.assigneeId, completedAt: t.completedAt, requestId: t.requestId };
}

export async function archiveTaskAction(taskId: string, archive: boolean): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'tasks.manage');
    const task = await findVisibleTask(viewer, taskId);
    if (!task) throw new ForbiddenError();
    if (archive && task.status !== 'completed') return { error: 'Only completed tasks can be archived.' };
    await db.update(tasks).set({ archivedAt: archive ? new Date() : null }).where(eq(tasks.id, taskId));
    await audit(viewer, archive ? 'task.archived' : 'task.restored', { entityType: 'task', entityId: taskId, metadata: snapshot(task) });
    revalidatePath('/portal/tasks');
    revalidatePath(`/portal/tasks/${taskId}`);
    return { ok: true, message: archive ? 'Task archived. It stays in history and can be restored.' : 'Task restored.' };
  });
}

/** Soft delete (Admin/Super Admin): hidden everywhere, recoverable by a Super Admin, full audit snapshot kept. */
export async function deleteTaskAction(taskId: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'tasks.manage');
    const task = await findVisibleTask(viewer, taskId);
    if (!task) throw new ForbiddenError();
    await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, taskId));
    await audit(viewer, 'task.deleted', { entityType: 'task', entityId: taskId, metadata: { ...snapshot(task), soft: true } });
    revalidatePath('/portal/tasks');
    return { ok: true, message: 'Task moved to Recently deleted.' };
  });
}

export async function restoreDeletedTaskAction(taskId: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!viewer.isSuperAdmin) throw new ForbiddenError();
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task?.deletedAt) return { error: 'Task not found in Recently deleted.' };
    await db.update(tasks).set({ deletedAt: null }).where(eq(tasks.id, taskId));
    await audit(viewer, 'task.restored', { entityType: 'task', entityId: taskId, metadata: snapshot(task) });
    revalidatePath('/portal/tasks');
    return { ok: true, message: 'Task restored.' };
  });
}

/**
 * Permanent deletion — Super Admin only, only after a soft delete, and the
 * caller must type the task title to confirm. Comments/checklist go with
 * it; the audit log keeps a full snapshot (audit rows can't be deleted).
 */
export async function purgeTaskAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!viewer.isSuperAdmin) throw new ForbiddenError('Only a Super Admin can permanently delete tasks.');
    const id = String(form.get('id') ?? '');
    if (!z.uuid().safeParse(id).success) return { error: 'Invalid task.' };
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return { error: 'Task not found.' };
    if (!task.deletedAt) return { error: 'Delete the task first; permanent deletion is only available from Recently deleted.' };
    if (String(form.get('confirm') ?? '').trim() !== task.title) return { fieldErrors: { confirm: 'Type the task title exactly to confirm.' } };
    await audit(viewer, 'task.purged', { entityType: 'task', entityId: id, metadata: { ...snapshot(task), description: task.description } });
    await db.delete(tasks).where(eq(tasks.id, id));
    revalidatePath('/portal/tasks');
    return { ok: true, message: 'Task permanently deleted. The audit log keeps a record of it.' };
  });
}

// ─── Checklist ───────────────────────────────────────────────────────────
async function editableTask(taskId: string) {
  const viewer = await requireViewerOrThrow();
  const task = z.uuid().safeParse(taskId).success ? await findVisibleTask(viewer, taskId) : null;
  if (!task || !(await canEditTask(viewer, task))) throw new ForbiddenError();
  return { viewer, task };
}

export async function toggleChecklistItemAction(taskId: string, itemId: string, done: boolean): Promise<ActionState> {
  return guarded(async () => {
    await editableTask(taskId);
    await db.update(taskChecklistItems).set({ isDone: done }).where(and(eq(taskChecklistItems.id, itemId), eq(taskChecklistItems.taskId, taskId)));
    revalidatePath(`/portal/tasks/${taskId}`);
    return { ok: true };
  });
}

export async function addChecklistItemAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const parsed = parseForm(z.object({ taskId: z.uuid(), label: z.string().trim().min(1, 'Add an item.').max(300) }), form);
    if (parsed.error) return parsed.error;
    await editableTask(parsed.data.taskId);
    const [{ pos }] = await db.select({ pos: max(taskChecklistItems.position) }).from(taskChecklistItems).where(eq(taskChecklistItems.taskId, parsed.data.taskId));
    await db.insert(taskChecklistItems).values({ taskId: parsed.data.taskId, label: parsed.data.label, position: (pos ?? 0) + 1 });
    revalidatePath(`/portal/tasks/${parsed.data.taskId}`);
    return { ok: true };
  });
}

export async function deleteChecklistItemAction(taskId: string, itemId: string): Promise<ActionState> {
  return guarded(async () => {
    await editableTask(taskId);
    await db.delete(taskChecklistItems).where(and(eq(taskChecklistItems.id, itemId), eq(taskChecklistItems.taskId, taskId)));
    revalidatePath(`/portal/tasks/${taskId}`);
    return { ok: true };
  });
}

// ─── Comments ────────────────────────────────────────────────────────────
export async function addTaskCommentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(z.object({ taskId: z.uuid(), body: z.string().trim().min(1, 'Write a comment.').max(5000), internal: z.string().optional() }), form);
    if (parsed.error) return parsed.error;
    const task = await findVisibleTask(viewer, parsed.data.taskId);
    if (!task) throw new ForbiddenError();
    // Clients can only post client-visible comments (and only see client-visible tasks at all).
    const isInternal = viewer.isInternal ? parsed.data.internal === 'on' || task.visibility === 'internal' : false;
    await db.insert(taskComments).values({ taskId: task.id, authorId: viewer.id, body: parsed.data.body, isInternal });

    const recipients = [task.assigneeId, task.reporterId];
    if (!isInternal) {
      recipients.push(...(await projectMemberIds(task.projectId, viewer.isInternal ? 'client' : 'team')));
    }
    await notifyUsers(recipients, { type: 'task.comment', title: `${viewer.name} commented`, body: `${task.title}: ${parsed.data.body.slice(0, 140)}`, link: `/portal/tasks/${task.id}` }, { actorId: viewer.id });
    revalidatePath(`/portal/tasks/${task.id}`);
    return { ok: true };
  });
}
