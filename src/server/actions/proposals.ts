'use server';

import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { clients, leads, proposalItems, proposals } from '@/server/db/schema';
import { assertCan, can, ForbiddenError, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { proposalScope } from '@/server/scope';
import { audit, recordActivity } from '@/server/audit';
import { clientUserIds, notifyUsers, usersWithPermission } from '@/server/notify';
import { nextCounter } from '@/server/settings';
import { convertProposalToProject, ensureClientFromLead } from '@/server/sales';
import { computeLine, computeTotals, CURRENCY_CODES, formatMoney, rupeesToPaise } from '@/lib/portal/invoice-math';
import { isEditableProposal, isOpenProposal } from '@/lib/portal/proposals';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const itemSchema = z.object({
  description: z.string().trim().min(1, 'Each line needs a description.').max(500),
  quantity: z.coerce.number().positive('Quantity must be positive.').max(1_000_000),
  unitPrice: z.union([z.string(), z.number()]).transform((v) => rupeesToPaise(v)),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxRatePct: z.coerce.number().min(0).max(100).default(0),
});

const optUuid = z
  .union([z.literal(''), z.uuid()])
  .optional()
  .transform((v) => v || null);

const proposalSchema = z
  .object({
    id: optUuid,
    intent: z.enum(['draft', 'send']).default('draft'),
    title: z.string().trim().min(3, 'Give the proposal a title.').max(160),
    clientId: optUuid,
    leadId: optUuid,
    currency: z.enum(CURRENCY_CODES as [string, ...string[]]).default('INR'),
    validUntil: z
      .union([z.literal(''), z.iso.date()])
      .optional()
      .transform((v) => v || null),
    summary: z.string().max(4000).default(''),
    scope: z.string().max(12000).default(''),
    terms: z.string().max(6000).default(''),
    items: z
      .string()
      .transform((s, ctx) => {
        try {
          return JSON.parse(s) as unknown;
        } catch {
          ctx.addIssue({ code: 'custom', message: 'Invalid line items.' });
          return z.NEVER;
        }
      })
      .pipe(z.array(itemSchema).min(1, 'Add at least one line item.').max(100)),
  })
  .refine((d) => Boolean(d.clientId) !== Boolean(d.leadId), { path: ['clientId'], message: 'Choose either a client or a lead.' });

async function loadProposal(viewer: Viewer, id: string) {
  if (!z.uuid().safeParse(id).success) throw new ForbiddenError();
  const [p] = await db.select().from(proposals).where(and(eq(proposals.id, id), proposalScope(viewer)));
  if (!p) throw new ForbiddenError('Proposal not found.');
  return p;
}

/** Create or update a draft; with intent=send it also issues the permanent number and delivers it. */
export async function saveProposalAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let target: string | undefined;
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'proposals.manage');
    const parsed = parseForm(proposalSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;

    if (d.clientId) {
      const [c] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, d.clientId));
      if (!c) return { fieldErrors: { clientId: 'Client not found.' } };
    } else if (d.leadId) {
      const [l] = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, d.leadId));
      if (!l) return { fieldErrors: { clientId: 'Lead not found.' } };
    }
    const lines = d.items.map((it, i) => ({ ...it, unitPricePaise: it.unitPrice, position: i }));
    const totals = computeTotals(lines);
    if (totals.totalPaise <= 0) return { error: 'The proposal total must be greater than zero.' };
    const sending = d.intent === 'send';
    if (sending && !d.validUntil) return { fieldErrors: { validUntil: 'Set how long the offer is valid before sending.' } };

    let proposalId = d.id || null;
    let number = '';
    await db.transaction(async (tx) => {
      if (proposalId) {
        const [existing] = await tx.select().from(proposals).where(eq(proposals.id, proposalId)).for('update');
        if (!existing) throw new ForbiddenError('Proposal not found.');
        if (!isEditableProposal(existing.status)) throw new ForbiddenError('Only draft proposals can be edited.');
      }
      const issue = sending ? `PRP-${new Date().getFullYear()}-${String(await nextCounter(`proposal:${new Date().getFullYear()}`, tx)).padStart(4, '0')}` : null;
      const values = {
        title: d.title,
        clientId: d.clientId,
        leadId: d.leadId,
        currency: d.currency,
        validUntil: d.validUntil,
        summary: d.summary,
        scope: d.scope,
        terms: d.terms,
        ...totals,
        ...(sending ? { status: 'sent', sentAt: new Date(), ...(issue ? { number: issue } : {}) } : {}),
      };
      if (proposalId) {
        await tx.update(proposals).set(values).where(eq(proposals.id, proposalId));
        await tx.delete(proposalItems).where(eq(proposalItems.proposalId, proposalId));
      } else {
        const [row] = await tx
          .insert(proposals)
          .values({ ...values, number: issue ?? `DRAFT-${randomBytes(4).toString('hex').toUpperCase()}`, ownerId: viewer.id, createdBy: viewer.id })
          .returning();
        proposalId = row.id;
      }
      await tx.insert(proposalItems).values(lines.map((l) => ({ proposalId: proposalId!, description: l.description, quantity: l.quantity, unitPricePaise: l.unitPricePaise, discountPct: l.discountPct, taxRatePct: l.taxRatePct, amountPaise: computeLine(l).taxablePaise, position: l.position })));
      const [row] = await tx.select({ number: proposals.number }).from(proposals).where(eq(proposals.id, proposalId));
      number = row.number;
    });

    const id = proposalId!;
    await audit(viewer, d.id ? (sending ? 'proposal.sent' : 'proposal.updated') : sending ? 'proposal.sent' : 'proposal.created', { entityType: 'proposal', entityId: id, metadata: { number, total: totals.totalPaise, currency: d.currency } });
    if (sending) await deliver(viewer, id);
    revalidatePath('/portal/proposals');
    target = `/portal/proposals/${id}`;
    return { ok: true };
  });
  if (target) redirect(target);
  return result;
}

/** Tell the client (or, for a lead-stage proposal, advance the lead) that the proposal is out. */
async function deliver(viewer: Viewer, proposalId: string) {
  const [p] = await db.select().from(proposals).where(eq(proposals.id, proposalId));
  const total = formatMoney(p.totalPaise, p.currency);
  if (p.clientId) {
    await notifyUsers(await clientUserIds(p.clientId), { type: 'proposal.sent', title: `New proposal: ${p.title}`, body: `${p.number} · ${total}${p.validUntil ? ` · valid until ${p.validUntil}` : ''}`, link: `/portal/proposals/${p.id}`, priority: 'high' }, { actorId: viewer.id });
    await recordActivity({ entityType: 'proposal', entityId: p.id, clientId: p.clientId, actorId: viewer.id, summary: `Proposal ${p.number} sent (${total})`, visibility: 'client' });
  }
  if (p.leadId) {
    await db.update(leads).set({ status: 'proposal_sent' }).where(and(eq(leads.id, p.leadId), eq(leads.status, 'qualified')));
    await recordActivity({ entityType: 'lead', entityId: p.leadId, leadId: p.leadId, actorId: viewer.id, summary: `Proposal ${p.number} sent (${total})` });
  }
}

/**
 * Accept / reject. Clients answer for their own account; internal staff with
 * proposals.manage can record an offline decision (e.g. accepted by email).
 * Acceptance of a lead-stage proposal automatically creates the client.
 */
export async function respondProposalAction(id: string, decision: 'accepted' | 'rejected', note?: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const p = await loadProposal(viewer, id);
    if (viewer.isInternal) assertCan(viewer, 'proposals.manage');
    else if (viewer.clientRole !== 'owner') throw new ForbiddenError('Only the account owner can accept or decline a proposal.');
    if (!isOpenProposal(p.status)) throw new ForbiddenError('This proposal can no longer be answered.');
    if (p.validUntil && p.validUntil < new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10)) throw new ForbiddenError('This proposal has expired. Ask us for an updated one.');

    const claimed = await db
      .update(proposals)
      .set({ status: decision, decidedAt: new Date(), decidedBy: viewer.id, decisionNote: (note ?? '').trim().slice(0, 1000) || null })
      .where(and(eq(proposals.id, p.id), eq(proposals.status, p.status)))
      .returning();
    if (claimed.length === 0) throw new ForbiddenError('This proposal was just updated. Refresh and try again.');

    let clientId = p.clientId;
    if (decision === 'accepted' && !clientId && p.leadId && viewer.isInternal && can(viewer, 'clients.manage')) {
      const [lead] = await db.select().from(leads).where(eq(leads.id, p.leadId));
      if (lead) {
        clientId = await ensureClientFromLead(viewer, lead);
        await db.update(proposals).set({ clientId }).where(eq(proposals.id, p.id));
      }
    }
    if (decision === 'rejected' && p.leadId) await db.update(leads).set({ status: 'negotiation' }).where(and(eq(leads.id, p.leadId), eq(leads.status, 'proposal_sent')));

    await audit(viewer, decision === 'accepted' ? 'proposal.accepted' : 'proposal.rejected', { entityType: 'proposal', entityId: p.id, metadata: { number: p.number } });
    await recordActivity({ entityType: 'proposal', entityId: p.id, clientId, leadId: p.leadId, actorId: viewer.id, summary: `Proposal ${p.number} ${decision}${note ? `: ${note.slice(0, 200)}` : ''}`, visibility: 'client' });
    const staff = new Set<string>([...(p.ownerId ? [p.ownerId] : []), ...(await usersWithPermission('proposals.manage'))]);
    await notifyUsers(staff, { type: `proposal.${decision}`, title: `Proposal ${decision}: ${p.title}`, body: `${p.number}${note ? ` — ${note.slice(0, 200)}` : ''}`, link: `/portal/proposals/${p.id}`, priority: 'high' }, { actorId: viewer.id });
    revalidatePath(`/portal/proposals/${p.id}`);
    revalidatePath('/portal/proposals');
    return { ok: true, message: decision === 'accepted' ? 'Proposal accepted — thank you.' : 'Proposal declined.' };
  });
}

/** Accepted proposal → client (if needed) + project + starter tasks, in one step. */
export async function convertProposalAction(id: string): Promise<ActionState> {
  let projectId: string | undefined;
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'proposals.manage');
    assertCan(viewer, 'projects.manage');
    const p = await loadProposal(viewer, id);
    if (p.status !== 'accepted') throw new ForbiddenError('Only an accepted proposal can be converted to a project.');
    if (!p.clientId) assertCan(viewer, 'clients.manage');
    // Claim the proposal first so a double click can't create two projects.
    const claimed = await db.update(proposals).set({ status: 'converted' }).where(and(eq(proposals.id, p.id), eq(proposals.status, 'accepted'))).returning();
    if (claimed.length === 0) throw new ForbiddenError('This proposal was already converted.');
    try {
      projectId = (await convertProposalToProject(viewer, p)).projectId;
    } catch (error) {
      await db.update(proposals).set({ status: 'accepted' }).where(eq(proposals.id, p.id));
      throw error;
    }
    revalidatePath('/portal/proposals');
    return { ok: true };
  });
  if (projectId) redirect(`/portal/projects/${projectId}`);
  return result;
}
