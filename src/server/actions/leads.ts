'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { leads, users } from '@/server/db/schema';
import { assertCan, can, ForbiddenError, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { leadScope } from '@/server/scope';
import { audit, recordActivity } from '@/server/audit';
import { notifyUsers } from '@/server/notify';
import { ensureClientFromLead } from '@/server/sales';
import { rupeesToPaise } from '@/lib/portal/invoice-math';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'] as const;
const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const leadSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name.').max(120),
  company: opt(160),
  email: z.email('Enter a valid email.').max(254),
  phone: opt(40),
  source: z.enum(['website_assessment', 'contact_form', 'referral', 'linkedin', 'manual', 'other']).default('manual'),
  serviceInterested: opt(160),
  status: z.enum(STATUSES).default('new'),
  estimatedValue: z.string().optional().transform((v) => (v ? rupeesToPaise(v) : 0)),
  followUpAt: z
    .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)])
    .optional()
    .transform((v) => (v ? new Date(`${v}:00+05:30`) : null)),
  assignedTo: z
    .union([z.literal(''), z.uuid()])
    .optional()
    .transform((v) => v || null),
  notes: z.string().trim().max(8000).default(''),
});

async function editableLead(v: Viewer, id: string) {
  if (!v.isInternal || !z.uuid().safeParse(id).success) throw new ForbiddenError();
  const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), leadScope(v)));
  if (!lead) throw new ForbiddenError();
  if (!can(v, 'leads.manage') && lead.assignedTo !== v.id) throw new ForbiddenError();
  return lead;
}

async function validAssignee(id: string | null) {
  if (!id) return null;
  const [u] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, id), ne(users.role, 'client'), eq(users.isActive, true)));
  return u?.id ?? null;
}

export async function createLeadAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let created: string | undefined;
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'leads.manage');
    const parsed = parseForm(leadSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const assignedTo = (await validAssignee(d.assignedTo)) ?? viewer.id;
    const [lead] = await db
      .insert(leads)
      .values({ name: d.name, company: d.company, email: d.email, phone: d.phone, source: d.source, serviceInterested: d.serviceInterested, status: d.status, estimatedValuePaise: d.estimatedValue, followUpAt: d.followUpAt, assignedTo, notes: d.notes })
      .returning({ id: leads.id });
    await recordActivity({ entityType: 'lead', entityId: lead.id, leadId: lead.id, actorId: viewer.id, summary: `Lead created (${d.source.replace('_', ' ')})` });
    await audit(viewer, 'lead.created', { entityType: 'lead', entityId: lead.id });
    if (assignedTo !== viewer.id) await notifyUsers([assignedTo], { type: 'lead.assigned', title: `Lead assigned: ${d.name}`, body: d.company ?? d.email, link: `/portal/leads/${lead.id}`, priority: 'high' }, { actorId: viewer.id });
    created = lead.id;
    revalidatePath('/portal/leads');
    return { ok: true };
  });
  if (created) redirect(`/portal/leads/${created}`);
  return result;
}

export async function updateLeadAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const lead = await editableLead(viewer, String(form.get('id')));
    const parsed = parseForm(leadSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    // Only lead managers may hand a lead to someone else.
    const assignedTo = can(viewer, 'leads.manage') ? await validAssignee(d.assignedTo) : lead.assignedTo;

    await db
      .update(leads)
      .set({ name: d.name, company: d.company, email: d.email, phone: d.phone, source: d.source, serviceInterested: d.serviceInterested, status: d.status, estimatedValuePaise: d.estimatedValue, followUpAt: d.followUpAt, followUpNotifiedAt: d.followUpAt?.getTime() !== lead.followUpAt?.getTime() ? null : lead.followUpNotifiedAt, assignedTo, notes: d.notes })
      .where(eq(leads.id, lead.id));

    const changes: string[] = [];
    if (lead.status !== d.status) changes.push(`status → ${d.status.replace('_', ' ')}`);
    if (lead.assignedTo !== assignedTo) changes.push('reassigned');
    if (lead.followUpAt?.getTime() !== d.followUpAt?.getTime()) changes.push(d.followUpAt ? `follow-up set for ${d.followUpAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}` : 'follow-up cleared');
    if (changes.length) await recordActivity({ entityType: 'lead', entityId: lead.id, leadId: lead.id, actorId: viewer.id, summary: changes.join(', ') });
    if (assignedTo && assignedTo !== lead.assignedTo) await notifyUsers([assignedTo], { type: 'lead.assigned', title: `Lead assigned: ${d.name}`, body: d.company ?? d.email, link: `/portal/leads/${lead.id}`, priority: 'high' }, { actorId: viewer.id });
    await audit(viewer, 'lead.updated', { entityType: 'lead', entityId: lead.id, metadata: { changes } });
    revalidatePath(`/portal/leads/${lead.id}`);
    revalidatePath('/portal/leads');
    return { ok: true, message: 'Lead saved.' };
  });
}

export async function setLeadStatusAction(id: string, status: (typeof STATUSES)[number]): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!STATUSES.includes(status)) return { error: 'Invalid status.' };
    const lead = await editableLead(viewer, id);
    if (lead.status === status) return { ok: true };
    await db.update(leads).set({ status }).where(eq(leads.id, id));
    await recordActivity({ entityType: 'lead', entityId: id, leadId: id, actorId: viewer.id, summary: `Status → ${status.replace('_', ' ')}` });
    await audit(viewer, 'lead.updated', { entityType: 'lead', entityId: id, metadata: { status } });
    revalidatePath('/portal/leads');
    return { ok: true };
  });
}

export async function logLeadActivityAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(z.object({ id: z.uuid(), kind: z.enum(['call', 'email', 'meeting', 'note']), body: z.string().trim().min(2, 'Add a note.').max(2000) }), form);
    if (parsed.error) return parsed.error;
    const lead = await editableLead(viewer, parsed.data.id);
    const label = { call: 'Call', email: 'Email', meeting: 'Meeting', note: 'Note' }[parsed.data.kind];
    await recordActivity({ entityType: 'lead', entityId: lead.id, leadId: lead.id, actorId: viewer.id, summary: `${label}: ${parsed.data.body}` });
    if (parsed.data.kind !== 'note' && lead.status === 'new') await db.update(leads).set({ status: 'contacted' }).where(eq(leads.id, lead.id));
    revalidatePath(`/portal/leads/${lead.id}`);
    return { ok: true };
  });
}

/** Won lead → client account (company details carried over, lead linked). */
export async function convertLeadAction(id: string): Promise<ActionState> {
  let clientId: string | undefined;
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'clients.manage');
    const lead = await editableLead(viewer, id);
    if (lead.convertedClientId) {
      clientId = lead.convertedClientId;
      return { ok: true };
    }
    clientId = await ensureClientFromLead(viewer, lead);
    return { ok: true };
  });
  if (clientId) redirect(`/portal/clients/${clientId}?tab=users`);
  return result;
}
