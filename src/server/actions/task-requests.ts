'use server';

import { and, eq, max } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { projects, taskRequestComments, taskRequests, tasks } from '@/server/db/schema';
import { assertCan, ForbiddenError, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { taskRequestScope } from '@/server/scope';
import { audit, recordActivity } from '@/server/audit';
import { clientUserIds, notifyUsers, usersWithPermission } from '@/server/notify';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const optUuid = z
  .union([z.literal(''), z.uuid()])
  .optional()
  .transform((v) => v || null);
const optDate = z
  .union([z.literal(''), z.iso.date()])
  .optional()
  .transform((v) => v || null);

/**
 * Client work requests.
 *
 * Clients can ask for work but can never assign it: there is no assignee
 * field anywhere in this flow for them. A reviewer (task_requests.review —
 * the Super Admin by default) approves or rejects; approval creates a
 * client-visible task that staff with tasks.manage then assign. Every step
 * is written to the audit log and the client's activity timeline.
 */
const requestSchema = z.object({
  title: z.string().trim().min(4, 'Describe the work in a few words.').max(200),
  description: z.string().trim().min(10, 'Add some detail (at least 10 characters).').max(8000),
  projectId: optUuid,
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  desiredDueDate: optDate,
});

async function findVisibleRequest(v: Viewer, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const [r] = await db.select().from(taskRequests).where(and(eq(taskRequests.id, id), taskRequestScope(v)));
  return r ?? null;
}

async function assertProjectOfClient(projectId: string | null, clientId: string) {
  if (!projectId) return;
  const [p] = await db.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, projectId));
  if (!p || p.clientId !== clientId) throw new ForbiddenError('That project isn’t part of your account.');
}

export async function createTaskRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let created: string | undefined;
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (viewer.isInternal || !viewer.clientId) throw new ForbiddenError('Work requests are submitted from a client account.');
    const parsed = parseForm(requestSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    await assertProjectOfClient(d.projectId, viewer.clientId);

    const [r] = await db
      .insert(taskRequests)
      .values({ clientId: viewer.clientId, projectId: d.projectId, requestedBy: viewer.id, title: d.title, description: d.description, priority: d.priority, desiredDueDate: d.desiredDueDate })
      .returning();
    await audit(viewer, 'task_request.created', { entityType: 'task_request', entityId: r.id, metadata: { title: r.title, priority: r.priority } });
    await recordActivity({ entityType: 'task_request', entityId: r.id, clientId: viewer.clientId, projectId: d.projectId, actorId: viewer.id, summary: `Work requested: “${r.title}”`, visibility: 'client' });
    await notifyUsers(await usersWithPermission('task_requests.review'), { type: 'task_request.created', title: `New work request from ${viewer.clientName}`, body: r.title, link: `/portal/requests/${r.id}`, priority: 'high' }, { actorId: viewer.id });
    created = r.id;
    revalidatePath('/portal/requests');
    return { ok: true };
  });
  if (created) redirect(`/portal/requests/${created}`);
  return result;
}

/** While a request is still pending the client may refine it (audited); afterwards changes go through a change request. */
export async function updateTaskRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const r = await findVisibleRequest(viewer, String(form.get('id')));
    if (!r || viewer.isInternal || r.clientId !== viewer.clientId) throw new ForbiddenError();
    if (r.status !== 'pending') return { error: 'This request has already been reviewed. Submit a change request for further changes.' };
    const parsed = parseForm(requestSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    await assertProjectOfClient(d.projectId, viewer.clientId!);
    const changed = (['title', 'description', 'projectId', 'priority', 'desiredDueDate'] as const).filter((k) => String(r[k] ?? '') !== String(d[k] ?? ''));
    if (!changed.length) return { ok: true, message: 'No changes.' };
    await db.update(taskRequests).set(d).where(eq(taskRequests.id, r.id));
    await audit(viewer, 'task_request.updated', { entityType: 'task_request', entityId: r.id, metadata: { changed, before: Object.fromEntries(changed.map((k) => [k, r[k]])), after: Object.fromEntries(changed.map((k) => [k, d[k]])) } });
    await recordActivity({ entityType: 'task_request', entityId: r.id, clientId: r.clientId, actorId: viewer.id, summary: `Request updated (${changed.join(', ')})`, visibility: 'client' });
    await notifyUsers(await usersWithPermission('task_requests.review'), { type: 'task_request.updated', title: 'Work request updated', body: d.title, link: `/portal/requests/${r.id}` }, { actorId: viewer.id });
    revalidatePath(`/portal/requests/${r.id}`);
    return { ok: true, message: 'Request updated. It’s still awaiting approval.' };
  });
}

export async function withdrawTaskRequestAction(id: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const r = await findVisibleRequest(viewer, id);
    if (!r || viewer.isInternal || r.clientId !== viewer.clientId || r.status !== 'pending') throw new ForbiddenError();
    await db.update(taskRequests).set({ status: 'cancelled' }).where(eq(taskRequests.id, r.id));
    await audit(viewer, 'task_request.updated', { entityType: 'task_request', entityId: r.id, metadata: { status: 'cancelled' } });
    await recordActivity({ entityType: 'task_request', entityId: r.id, clientId: r.clientId, actorId: viewer.id, summary: `Request withdrawn: “${r.title}”`, visibility: 'client' });
    revalidatePath(`/portal/requests/${r.id}`);
    return { ok: true };
  });
}

/** Extra information on a request — from the client, or an (optionally internal) note from staff. */
export async function commentOnTaskRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(z.object({ id: z.uuid(), body: z.string().trim().min(1, 'Write something.').max(5000), internal: z.string().optional() }), form);
    if (parsed.error) return parsed.error;
    const r = await findVisibleRequest(viewer, parsed.data.id);
    if (!r) throw new ForbiddenError();
    const isInternal = viewer.isInternal && parsed.data.internal === 'on';
    await db.insert(taskRequestComments).values({ requestId: r.id, authorId: viewer.id, body: parsed.data.body, isInternal });
    await audit(viewer, 'task_request.updated', { entityType: 'task_request', entityId: r.id, metadata: { comment: true, internal: isInternal } });
    if (!isInternal) {
      await recordActivity({ entityType: 'task_request', entityId: r.id, clientId: r.clientId, actorId: viewer.id, summary: `${viewer.isInternal ? 'Isha Technologies replied' : 'Client added information'} on “${r.title}”`, visibility: 'client' });
      const recipients = viewer.isInternal ? await clientUserIds(r.clientId) : await usersWithPermission('task_requests.review');
      await notifyUsers(recipients, { type: 'task_request.comment', title: `New message on work request`, body: `${r.title}: ${parsed.data.body.slice(0, 140)}`, link: `/portal/requests/${r.id}` }, { actorId: viewer.id });
    }
    revalidatePath(`/portal/requests/${r.id}`);
    return { ok: true };
  });
}

const reviewSchema = z.object({
  id: z.uuid(),
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(2000).optional().transform((v) => v || null),
  projectId: optUuid,
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: optDate,
});

/**
 * Super Admin (or delegated reviewer) decision. Approval turns the request
 * into a client-visible task on one of the client's projects; assignment is
 * a separate, staff-only step.
 */
export async function reviewTaskRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'task_requests.review');
    const parsed = parseForm(reviewSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;

    const outcome = await db.transaction(async (tx) => {
      const [r] = await tx.select().from(taskRequests).where(eq(taskRequests.id, d.id)).for('update');
      if (!r || r.status !== 'pending') return { error: 'This request has already been reviewed.' } as const;
      if (d.decision === 'rejected') {
        if (!d.note) return { fieldErrors: { note: 'Tell the client why (they’ll see this note).' } } as const;
        await tx.update(taskRequests).set({ status: 'rejected', reviewedBy: viewer.id, reviewedAt: new Date(), reviewNote: d.note }).where(eq(taskRequests.id, r.id));
        return { r, taskId: null } as const;
      }
      const projectId = d.projectId ?? r.projectId;
      if (!projectId) return { fieldErrors: { projectId: 'Choose the project this work belongs to.' } } as const;
      const [p] = await tx.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, projectId));
      // The task must live in the requesting client's own project — never another tenant's.
      if (!p || p.clientId !== r.clientId) return { fieldErrors: { projectId: 'That project belongs to a different client.' } } as const;
      const [{ pos }] = await tx.select({ pos: max(tasks.position) }).from(tasks).where(eq(tasks.projectId, projectId));
      const [task] = await tx
        .insert(tasks)
        .values({
          projectId,
          title: r.title,
          description: r.description,
          priority: d.priority ?? r.priority,
          dueDate: d.dueDate ?? r.desiredDueDate,
          visibility: 'client',
          reporterId: r.requestedBy,
          requestId: r.id,
          position: (pos ?? 0) + 1,
        })
        .returning({ id: tasks.id });
      await tx.update(taskRequests).set({ status: 'approved', reviewedBy: viewer.id, reviewedAt: new Date(), reviewNote: d.note, projectId, taskId: task.id }).where(eq(taskRequests.id, r.id));
      return { r, taskId: task.id } as const;
    });
    if ('error' in outcome) return { error: outcome.error };
    if ('fieldErrors' in outcome) return { fieldErrors: outcome.fieldErrors as unknown as Record<string, string> };
    const { r, taskId } = outcome;

    if (d.decision === 'approved') {
      await audit(viewer, 'task_request.approved', { entityType: 'task_request', entityId: r.id, metadata: { taskId } });
      await audit(viewer, 'task.created', { entityType: 'task', entityId: taskId!, metadata: { fromRequest: r.id } });
      await recordActivity({ entityType: 'task_request', entityId: r.id, clientId: r.clientId, projectId: d.projectId ?? r.projectId, actorId: viewer.id, summary: `Work request approved: “${r.title}”`, visibility: 'client' });
      await notifyUsers([r.requestedBy], { type: 'task_request.approved', title: 'Your work request was approved', body: r.title, link: `/portal/requests/${r.id}`, priority: 'high' }, { actorId: viewer.id });
      // Hand over to the people who can assign it.
      await notifyUsers(await usersWithPermission('tasks.manage'), { type: 'task_request.to_assign', title: 'Approved work request needs an assignee', body: r.title, link: `/portal/tasks/${taskId}`, priority: 'high' }, { actorId: viewer.id });
    } else {
      await audit(viewer, 'task_request.rejected', { entityType: 'task_request', entityId: r.id, metadata: { note: d.note } });
      await recordActivity({ entityType: 'task_request', entityId: r.id, clientId: r.clientId, actorId: viewer.id, summary: `Work request declined: “${r.title}”`, visibility: 'client' });
      await notifyUsers([r.requestedBy], { type: 'task_request.rejected', title: 'Your work request was declined', body: `${r.title}${d.note ? ` — ${d.note}` : ''}`, link: `/portal/requests/${r.id}`, priority: 'high' }, { actorId: viewer.id });
    }
    revalidatePath(`/portal/requests/${r.id}`);
    revalidatePath('/portal/requests');
    return { ok: true, message: d.decision === 'approved' ? 'Approved — the task is ready to be assigned.' : 'Request declined and the client notified.' };
  });
}

