'use server';

import { and, eq, inArray, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { clientUsers, clients, projectMembers, projects, users } from '@/server/db/schema';
import { assertCan, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { audit, recordActivity } from '@/server/audit';
import { nextCounter } from '@/server/settings';
import { notifyUsers } from '@/server/notify';
import { rupeesToPaise } from '@/lib/portal/invoice-math';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const ids = z.preprocess((v) => (v === undefined || v === '' ? [] : Array.isArray(v) ? v : [v]), z.array(z.uuid()).max(100));
const optDate = z
  .union([z.literal(''), z.iso.date()])
  .optional()
  .transform((v) => v || null);

const projectSchema = z
  .object({
    name: z.string().trim().min(3, 'Give the project a name.').max(160),
    clientId: z.uuid('Choose a client.'),
    description: z.string().trim().max(8000).default(''),
    status: z.enum(['planning', 'active', 'on_hold', 'at_risk', 'completed', 'cancelled']).default('planning'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    health: z.enum(['on_track', 'at_risk', 'off_track']).default('on_track'),
    startDate: optDate,
    dueDate: optDate,
    budget: z.string().optional().transform((v) => (v ? rupeesToPaise(v) : 0)),
    technologies: z
      .string()
      .optional()
      .transform((v) => (v ? [...new Set(v.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 30) : [])),
    teamIds: ids,
    leadId: z
      .union([z.literal(''), z.uuid()])
      .optional()
      .transform((v) => v || null),
    clientMemberIds: ids,
  })
  .refine((d) => !d.startDate || !d.dueDate || d.dueDate >= d.startDate, { path: ['dueDate'], message: 'Expected completion must be after the start date.' });

type ProjectInput = z.infer<typeof projectSchema>;

/**
 * Server-side membership validation: team members must be active internal
 * users; client members must be users of *this project's* client — a
 * crafted request can never attach another client's user to a project.
 */
async function validateMembers(d: ProjectInput): Promise<{ team: string[]; clientMembers: string[] } | ActionState> {
  const team = d.teamIds.length
    ? (await db.select({ id: users.id }).from(users).where(and(inArray(users.id, d.teamIds), ne(users.role, 'client'), eq(users.isActive, true)))).map((r) => r.id)
    : [];
  if (team.length !== d.teamIds.length) return { fieldErrors: { teamIds: 'One or more team members are invalid.' } };
  const clientMembers = d.clientMemberIds.length
    ? (await db.select({ id: clientUsers.userId }).from(clientUsers).where(and(eq(clientUsers.clientId, d.clientId), inArray(clientUsers.userId, d.clientMemberIds)))).map((r) => r.id)
    : [];
  if (clientMembers.length !== d.clientMemberIds.length) return { fieldErrors: { clientMemberIds: 'Client members must belong to the selected client.' } };
  if (d.leadId && !team.includes(d.leadId)) team.push(d.leadId);
  return { team, clientMembers };
}

async function syncMembers(projectId: string, team: string[], clientMembers: string[], leadId: string | null) {
  const existing = await db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
  const wanted = new Map<string, 'team' | 'client'>([...team.map((id) => [id, 'team'] as const), ...clientMembers.map((id) => [id, 'client'] as const)]);
  const removed = existing.filter((m) => !wanted.has(m.userId)).map((m) => m.userId);
  if (removed.length) await db.delete(projectMembers).where(and(eq(projectMembers.projectId, projectId), inArray(projectMembers.userId, removed)));
  const added: string[] = [];
  for (const [userId, memberType] of wanted) {
    const isLead = userId === leadId;
    const before = existing.find((m) => m.userId === userId);
    if (!before) {
      await db.insert(projectMembers).values({ projectId, userId, memberType, isLead });
      added.push(userId);
    } else if (before.isLead !== isLead) {
      await db.update(projectMembers).set({ isLead }).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
    }
  }
  return { added, removed };
}

export async function createProjectAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let createdId: string | undefined;
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'projects.manage');
    const parsed = parseForm(projectSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const [client] = await db.select({ id: clients.id, name: clients.companyName }).from(clients).where(eq(clients.id, d.clientId));
    if (!client) return { fieldErrors: { clientId: 'Client not found.' } };
    const members = await validateMembers(d);
    if (!('team' in members)) return members;

    const n = await nextCounter('project');
    const [p] = await db
      .insert(projects)
      .values({
        code: `PRJ-${String(n).padStart(4, '0')}`,
        name: d.name,
        clientId: d.clientId,
        description: d.description,
        status: d.status,
        priority: d.priority,
        health: d.health,
        startDate: d.startDate,
        dueDate: d.dueDate,
        budgetPaise: d.budget,
        technologies: d.technologies,
        createdBy: viewer.id,
      })
      .returning();
    await syncMembers(p.id, members.team, members.clientMembers, d.leadId);
    await notifyUsers([...members.team, ...members.clientMembers], { type: 'project.assigned', title: `Added to project ${p.name}`, body: client.name, link: `/portal/projects/${p.id}` }, { actorId: viewer.id });
    await audit(viewer, 'project.created', { entityType: 'project', entityId: p.id, metadata: { clientId: d.clientId } });
    await recordActivity({ entityType: 'project', entityId: p.id, projectId: p.id, clientId: d.clientId, actorId: viewer.id, summary: `Project ${p.name} created`, visibility: 'client' });
    createdId = p.id;
    revalidatePath('/portal/projects');
    return { ok: true };
  });
  if (createdId) redirect(`/portal/projects/${createdId}`);
  return result;
}

export async function updateProjectAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'projects.manage');
    const id = z.uuid().safeParse(form.get('id'));
    if (!id.success) return { error: 'Invalid project.' };
    const parsed = parseForm(projectSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const [before] = await db.select().from(projects).where(eq(projects.id, id.data));
    if (!before) return { error: 'Project not found.' };
    // The owning client is fixed after creation — moving a project between clients would move its history across tenants.
    if (before.clientId !== d.clientId) return { fieldErrors: { clientId: 'A project cannot be moved to a different client.' } };
    const members = await validateMembers(d);
    if (!('team' in members)) return members;

    await db
      .update(projects)
      .set({
        name: d.name,
        description: d.description,
        status: d.status,
        priority: d.priority,
        health: d.health,
        startDate: d.startDate,
        dueDate: d.dueDate,
        budgetPaise: d.budget,
        technologies: d.technologies,
        completedAt: d.status === 'completed' ? (before.completedAt ?? new Date()) : null,
      })
      .where(eq(projects.id, id.data));
    const { added, removed } = await syncMembers(id.data, members.team, members.clientMembers, d.leadId);
    if (added.length) await notifyUsers(added, { type: 'project.assigned', title: `Added to project ${d.name}`, link: `/portal/projects/${id.data}` }, { actorId: viewer.id });
    if (added.length || removed.length) await audit(viewer, 'project.members_changed', { entityType: 'project', entityId: id.data, metadata: { added, removed } });
    await audit(viewer, 'project.updated', { entityType: 'project', entityId: id.data });

    await projectUpdateSideEffects(viewer, before, d, members);
    revalidatePath(`/portal/projects/${id.data}`);
    revalidatePath('/portal/projects');
    return { ok: true, message: 'Project saved.' };
  });
}

async function projectUpdateSideEffects(viewer: Viewer, before: typeof projects.$inferSelect, d: ProjectInput, members: { team: string[]; clientMembers: string[] }) {
  const changes: string[] = [];
  if (before.status !== d.status) changes.push(`status → ${d.status.replace('_', ' ')}`);
  if (before.health !== d.health) changes.push(`health → ${d.health.replace('_', ' ')}`);
  if (before.dueDate !== d.dueDate) changes.push(`expected completion → ${d.dueDate ?? 'none'}`);
  if (!changes.length) return;
  const summary = `${d.name}: ${changes.join(', ')}`;
  await recordActivity({ entityType: 'project', entityId: before.id, projectId: before.id, clientId: before.clientId, actorId: viewer.id, summary, visibility: 'client' });
  await notifyUsers([...members.team, ...members.clientMembers], { type: 'project.updated', title: 'Project updated', body: summary, link: `/portal/projects/${before.id}` }, { actorId: viewer.id });
}
