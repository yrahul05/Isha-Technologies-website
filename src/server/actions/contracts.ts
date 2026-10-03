'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { clients, contracts, documents, projects } from '@/server/db/schema';
import { assertCan, ForbiddenError, requireViewerOrThrow } from '@/server/auth/viewer';
import { audit, recordActivity } from '@/server/audit';
import { clientUserIds, notifyUsers } from '@/server/notify';
import { nextCounter } from '@/server/settings';
import { CURRENCY_CODES, formatMoney, rupeesToPaise } from '@/lib/portal/invoice-math';
import { CONTRACT_KINDS, CONTRACT_STATUSES } from '@/lib/portal/proposals';
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

const contractSchema = z
  .object({
    id: optUuid,
    title: z.string().trim().min(3, 'Give the contract a title.').max(200),
    kind: z.enum(CONTRACT_KINDS.map((k) => k.value) as [string, ...string[]]),
    clientId: z.uuid('Choose a client.'),
    projectId: optUuid,
    documentId: optUuid,
    status: z.enum(CONTRACT_STATUSES),
    currency: z.enum(CURRENCY_CODES as [string, ...string[]]).default('INR'),
    value: z.string().optional().transform((v) => (v ? rupeesToPaise(v) : 0)),
    startDate: optDate,
    endDate: optDate,
    autoRenew: z
      .string()
      .optional()
      .transform((v) => v === 'on' || v === 'true'),
    renewalNoticeDays: z.coerce.number().int().min(0).max(365).default(30),
    signedBy: z
      .string()
      .trim()
      .max(160)
      .optional()
      .transform((v) => v || null),
    notes: z.string().max(4000).default(''),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, { path: ['endDate'], message: 'The end date must be on or after the start date.' })
  .refine((d) => d.status !== 'active' || Boolean(d.endDate) || d.kind === 'nda' || d.kind === 'msa', { path: ['endDate'], message: 'Active contracts need an end date (so renewals can be tracked).' });

export async function saveContractAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let target: string | undefined;
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'contracts.manage');
    const parsed = parseForm(contractSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;

    const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, d.clientId));
    if (!client) return { fieldErrors: { clientId: 'Client not found.' } };
    if (d.projectId) {
      const [p] = await db.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, d.projectId));
      if (!p || p.clientId !== d.clientId) return { fieldErrors: { projectId: 'That project belongs to a different client.' } };
    }
    if (d.documentId) {
      const [doc] = await db.select({ clientId: documents.clientId }).from(documents).where(eq(documents.id, d.documentId));
      if (!doc || doc.clientId !== d.clientId) return { fieldErrors: { documentId: 'That document belongs to a different client.' } };
    }

    const values = {
      title: d.title,
      kind: d.kind,
      clientId: d.clientId,
      projectId: d.projectId,
      documentId: d.documentId,
      status: d.status,
      currency: d.currency,
      valuePaise: d.value,
      startDate: d.startDate,
      endDate: d.endDate,
      autoRenew: d.autoRenew,
      renewalNoticeDays: d.renewalNoticeDays,
      signedBy: d.signedBy,
      notes: d.notes,
    };
    let id = d.id;
    let activated = false;
    if (id) {
      const [before] = await db.select().from(contracts).where(eq(contracts.id, id));
      if (!before) throw new ForbiddenError('Contract not found.');
      if (before.clientId !== d.clientId) throw new ForbiddenError('A contract cannot be moved to another client.');
      activated = before.status === 'draft' && d.status === 'active';
      await db.update(contracts).set({ ...values, ...(activated ? { signedAt: new Date() } : {}) }).where(eq(contracts.id, id));
      await audit(viewer, before.status !== d.status ? 'contract.status_changed' : 'contract.updated', { entityType: 'contract', entityId: id, metadata: { from: before.status, to: d.status } });
    } else {
      const year = new Date().getFullYear();
      const number = `CTR-${year}-${String(await nextCounter(`contract:${year}`)).padStart(4, '0')}`;
      const [row] = await db
        .insert(contracts)
        .values({ ...values, number, createdBy: viewer.id, ...(d.status === 'active' ? { signedAt: new Date() } : {}) })
        .returning({ id: contracts.id });
      id = row.id;
      activated = d.status === 'active';
      await audit(viewer, 'contract.created', { entityType: 'contract', entityId: id, metadata: { number } });
    }
    if (activated) {
      const value = d.value ? ` · ${formatMoney(d.value, d.currency)}` : '';
      await notifyUsers(await clientUserIds(d.clientId), { type: 'contract.activated', title: `Contract available: ${d.title}`, body: `Now active${d.endDate ? ` until ${d.endDate}` : ''}${value}`, link: `/portal/contracts/${id}` }, { actorId: viewer.id });
      await recordActivity({ entityType: 'contract', entityId: id, clientId: d.clientId, actorId: viewer.id, summary: `Contract “${d.title}” became active`, visibility: 'client' });
    }
    revalidatePath('/portal/contracts');
    revalidatePath('/portal/renewals');
    target = `/portal/contracts/${id}`;
    return { ok: true };
  });
  if (target) redirect(target);
  return result;
}
