'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { clients, projects, ticketComments, tickets, users } from '@/server/db/schema';
import { can, ForbiddenError, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { isProjectMember, ticketScope } from '@/server/scope';
import { audit, recordActivity } from '@/server/audit';
import { clientUserIds, notifyUsers, projectMemberIds, usersWithPermission } from '@/server/notify';
import { nextCounter } from '@/server/settings';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const CATEGORIES = ['general', 'incident', 'access', 'change', 'billing', 'question'] as const;
const optUuid = z
  .union([z.literal(''), z.uuid()])
  .optional()
  .transform((v) => v || null);

const createSchema = z.object({
  clientId: optUuid,
  projectId: optUuid,
  subject: z.string().trim().min(4, 'Add a short subject.').max(200),
  description: z.string().trim().min(10, 'Describe the issue (at least 10 characters).').max(10000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.enum(CATEGORIES).default('general'),
  assigneeId: optUuid,
});

async function findVisibleTicket(v: Viewer, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const [t] = await db.select().from(tickets).where(and(eq(tickets.id, id), ticketScope(v)));
  return t ?? null;
}

async function canWorkTicket(v: Viewer, t: typeof tickets.$inferSelect) {
  if (!v.isInternal) return false;
  if (can(v, 'tickets.manage')) return true;
  return t.assigneeId === v.id || (t.projectId ? await isProjectMember(v, t.projectId) : false);
}

/** Staff who should hear about a ticket: assignee, else project team, else ticket managers. */
async function staffFor(t: { assigneeId: string | null; projectId: string | null; clientId: string }) {
  if (t.assigneeId) return [t.assigneeId];
  const team = t.projectId ? await projectMemberIds(t.projectId, 'team') : [];
  if (team.length) return team;
  const [c] = await db.select({ am: clients.accountManagerId }).from(clients).where(eq(clients.id, t.clientId));
  return c?.am ? [c.am] : usersWithPermission('tickets.manage');
}

export async function createTicketAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let created: string | undefined;
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(createSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;

    // Clients: always their own account. Staff: an explicit client they can act for.
    const clientId = viewer.isInternal ? d.clientId : viewer.clientId;
    if (!clientId) return { fieldErrors: { clientId: 'Choose a client.' } };
    if (viewer.isInternal && !can(viewer, 'tickets.manage')) {
      if (!d.projectId || !(await isProjectMember(viewer, d.projectId))) throw new ForbiddenError('Pick one of your projects.');
    }
    if (d.projectId) {
      const [p] = await db.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, d.projectId));
      if (!p || p.clientId !== clientId) return { fieldErrors: { projectId: 'That project isn’t part of this account.' } };
    }
    let assigneeId: string | null = null;
    if (viewer.isInternal && d.assigneeId) {
      const [u] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, d.assigneeId), ne(users.role, 'client'), eq(users.isActive, true)));
      assigneeId = u?.id ?? null;
    }

    const n = await nextCounter('ticket');
    const [t] = await db
      .insert(tickets)
      .values({
        number: `TKT-${String(n).padStart(5, '0')}`,
        clientId,
        projectId: d.projectId,
        subject: d.subject,
        description: d.description,
        priority: d.priority,
        category: d.category,
        createdBy: viewer.id,
        assigneeId,
      })
      .returning();

    await audit(viewer, 'ticket.created', { entityType: 'ticket', entityId: t.id, metadata: { number: t.number, priority: t.priority } });
    await recordActivity({ entityType: 'ticket', entityId: t.id, clientId, projectId: d.projectId, actorId: viewer.id, summary: `Ticket ${t.number} opened: ${t.subject}`, visibility: 'client' });
    const recipients = viewer.isInternal ? await clientUserIds(clientId) : await staffFor(t);
    await notifyUsers(recipients, { type: 'ticket.created', title: `New ticket ${t.number}`, body: t.subject, link: `/portal/tickets/${t.id}`, priority: t.priority === 'urgent' || t.priority === 'high' ? 'high' : 'normal' }, { actorId: viewer.id });
    created = t.id;
    revalidatePath('/portal/tickets');
    return { ok: true };
  });
  if (created) redirect(`/portal/tickets/${created}`);
  return result;
}

export async function replyTicketAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(z.object({ ticketId: z.uuid(), body: z.string().trim().min(1, 'Write a reply.').max(10000), internal: z.string().optional() }), form);
    if (parsed.error) return parsed.error;
    const t = await findVisibleTicket(viewer, parsed.data.ticketId);
    if (!t) throw new ForbiddenError();
    if (t.status === 'closed' && !viewer.isInternal) return { error: 'This ticket is closed. Reopen it to reply.' };
    if (viewer.isInternal && !(await canWorkTicket(viewer, t))) throw new ForbiddenError();

    const isInternal = viewer.isInternal && parsed.data.internal === 'on';
    await db.insert(ticketComments).values({ ticketId: t.id, authorId: viewer.id, body: parsed.data.body, isInternal });

    // A client reply re-activates a ticket that was waiting on them; a staff reply acknowledges a new one.
    let status = t.status;
    if (!viewer.isInternal && (t.status === 'waiting_for_client' || t.status === 'resolved')) status = 'in_progress';
    if (viewer.isInternal && !isInternal && t.status === 'open') status = 'in_progress';
    await db.update(tickets).set({ status, lastActivityAt: new Date(), resolvedAt: status === 'resolved' ? t.resolvedAt : null }).where(eq(tickets.id, t.id));

    if (!isInternal) {
      const recipients = viewer.isInternal ? await clientUserIds(t.clientId) : await staffFor(t);
      await notifyUsers(recipients, { type: 'ticket.updated', title: `${viewer.isInternal ? 'Reply from Isha Technologies' : 'Client replied'} · ${t.number}`, body: parsed.data.body.slice(0, 160), link: `/portal/tickets/${t.id}` }, { actorId: viewer.id });
    }
    revalidatePath(`/portal/tickets/${t.id}`);
    return { ok: true };
  });
}

const updateSchema = z.object({
  ticketId: z.uuid(),
  status: z.enum(['open', 'in_progress', 'waiting_for_client', 'resolved', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(CATEGORIES),
  assigneeId: optUuid,
});

export async function updateTicketAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(updateSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const t = await findVisibleTicket(viewer, d.ticketId);
    if (!t || !(await canWorkTicket(viewer, t))) throw new ForbiddenError();
    if (d.assigneeId && d.assigneeId !== t.assigneeId && !can(viewer, 'tickets.manage')) throw new ForbiddenError('Only ticket managers can reassign.');

    await db
      .update(tickets)
      .set({ status: d.status, priority: d.priority, category: d.category, assigneeId: d.assigneeId, lastActivityAt: new Date(), resolvedAt: d.status === 'resolved' ? new Date() : d.status === 'closed' ? (t.resolvedAt ?? new Date()) : null })
      .where(eq(tickets.id, t.id));
    await audit(viewer, 'ticket.updated', { entityType: 'ticket', entityId: t.id, metadata: { status: d.status, priority: d.priority, assigneeId: d.assigneeId } });
    if (d.status !== t.status) {
      const label = d.status.replace(/_/g, ' ');
      await recordActivity({ entityType: 'ticket', entityId: t.id, clientId: t.clientId, projectId: t.projectId, actorId: viewer.id, summary: `Ticket ${t.number} marked ${label}`, visibility: 'client' });
      await notifyUsers(await clientUserIds(t.clientId), { type: 'ticket.updated', title: `Ticket ${t.number} is now ${label}`, body: t.subject, link: `/portal/tickets/${t.id}` }, { actorId: viewer.id });
    }
    if (d.assigneeId && d.assigneeId !== t.assigneeId) {
      await notifyUsers([d.assigneeId], { type: 'ticket.assigned', title: `Ticket ${t.number} assigned to you`, body: t.subject, link: `/portal/tickets/${t.id}`, priority: 'high' }, { actorId: viewer.id });
    }
    revalidatePath(`/portal/tickets/${t.id}`);
    revalidatePath('/portal/tickets');
    return { ok: true, message: 'Ticket updated.' };
  });
}

/** Client-side close / reopen of their own ticket. */
export async function clientTicketStatusAction(ticketId: string, action: 'close' | 'reopen'): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const t = await findVisibleTicket(viewer, ticketId);
    if (!t || viewer.isInternal) throw new ForbiddenError();
    const status = action === 'close' ? 'closed' : 'open';
    await db.update(tickets).set({ status, lastActivityAt: new Date() }).where(eq(tickets.id, t.id));
    await audit(viewer, 'ticket.updated', { entityType: 'ticket', entityId: t.id, metadata: { status } });
    await recordActivity({ entityType: 'ticket', entityId: t.id, clientId: t.clientId, projectId: t.projectId, actorId: viewer.id, summary: `Ticket ${t.number} ${action === 'close' ? 'closed' : 'reopened'} by client`, visibility: 'client' });
    await notifyUsers(await staffFor(t), { type: 'ticket.updated', title: `Ticket ${t.number} ${action === 'close' ? 'closed' : 'reopened'} by client`, body: t.subject, link: `/portal/tickets/${t.id}` }, { actorId: viewer.id });
    revalidatePath(`/portal/tickets/${t.id}`);
    return { ok: true };
  });
}
