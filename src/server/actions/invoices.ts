'use server';

import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { clients, invoiceItems, invoices, payments, projects } from '@/server/db/schema';
import { assertCan, ForbiddenError, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { audit, recordActivity } from '@/server/audit';
import { clientUserIds, notifyUsers } from '@/server/notify';
import { getSetting, nextCounter } from '@/server/settings';
import { computeLine, computeTotals, deriveInvoiceStatus, formatINR, isValidGstin, rupeesToPaise } from '@/lib/portal/invoice-math';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const itemSchema = z.object({
  description: z.string().trim().min(1, 'Each line needs a description.').max(500),
  hsnSac: z.string().trim().max(12).optional().default(''),
  quantity: z.coerce.number().positive('Quantity must be positive.').max(1_000_000),
  unitPrice: z.union([z.string(), z.number()]).transform((v) => rupeesToPaise(v)),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxRatePct: z.coerce.number().min(0).max(28).default(18),
});

const invoiceSchema = z
  .object({
    id: z.union([z.literal(''), z.uuid()]).optional(),
    intent: z.enum(['draft', 'send']).default('draft'),
    clientId: z.uuid('Choose a client.'),
    projectId: z
      .union([z.literal(''), z.uuid()])
      .optional()
      .transform((v) => v || null),
    issueDate: z.iso.date('Choose the invoice date.'),
    dueDate: z.iso.date('Choose the due date.'),
    billingName: z.string().trim().min(2, 'Enter the billing name.').max(200),
    billingAddress: z.string().trim().max(600).default(''),
    billingGstin: z
      .string()
      .trim()
      .max(15)
      .optional()
      .transform((v) => (v ? v.toUpperCase() : null))
      .refine((v) => !v || isValidGstin(v), 'That GSTIN doesn’t look valid.'),
    placeOfSupply: z
      .string()
      .regex(/^\d{2}$/)
      .optional()
      .or(z.literal(''))
      .transform((v) => v || null),
    notes: z.string().max(2000).default(''),
    terms: z.string().max(2000).default(''),
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
  .refine((d) => d.dueDate >= d.issueDate, { path: ['dueDate'], message: 'Due date must be on or after the invoice date.' });

export async function saveInvoiceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let target: string | undefined;
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'invoices.manage');
    const parsed = parseForm(invoiceSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;

    const [client] = await db.select().from(clients).where(eq(clients.id, d.clientId));
    if (!client) return { fieldErrors: { clientId: 'Client not found.' } };
    if (d.projectId) {
      const [p] = await db.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, d.projectId));
      if (!p || p.clientId !== d.clientId) return { fieldErrors: { projectId: 'That project belongs to a different client.' } };
    }

    const lines = d.items.map((it, i) => ({ ...it, unitPricePaise: it.unitPrice, position: i }));
    const totals = computeTotals(lines);
    if (totals.totalPaise <= 0) return { error: 'The invoice total must be greater than zero.' };

    let invoiceId = d.id || null;
    let wasDraft = true;
    await db.transaction(async (tx) => {
      if (invoiceId) {
        const [existing] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
        if (!existing) throw new ForbiddenError('Invoice not found.');
        if (existing.status === 'cancelled') throw new ForbiddenError('Cancelled invoices can’t be edited.');
        if (existing.clientId !== d.clientId) throw new ForbiddenError('An invoice cannot be moved to another client.');
        if (totals.totalPaise < existing.paidPaise) throw new ForbiddenError(`The total can’t be less than the ${formatINR(existing.paidPaise)} already paid.`);
        wasDraft = existing.status === 'draft';
        const status = d.intent === 'send' || !wasDraft ? deriveInvoiceStatus({ status: 'sent', totalPaise: totals.totalPaise, paidPaise: existing.paidPaise, dueDate: d.dueDate }) : 'draft';
        await tx
          .update(invoices)
          .set({ ...pick(d), ...totals, status, sentAt: status !== 'draft' ? (existing.sentAt ?? new Date()) : null })
          .where(eq(invoices.id, invoiceId));
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
      } else {
        const settings = await getSetting('invoice');
        const year = d.issueDate.slice(0, 4);
        const seq = await nextCounter(`invoice:${year}`, tx);
        const [row] = await tx
          .insert(invoices)
          .values({
            ...pick(d),
            ...totals,
            number: `${settings.prefix}-${year}-${String(seq).padStart(4, '0')}`,
            clientId: d.clientId,
            status: d.intent === 'send' ? 'sent' : 'draft',
            sentAt: d.intent === 'send' ? new Date() : null,
            createdBy: viewer.id,
          })
          .returning({ id: invoices.id });
        invoiceId = row.id;
      }
      await tx.insert(invoiceItems).values(
        lines.map((l) => ({
          invoiceId: invoiceId!,
          description: l.description,
          hsnSac: l.hsnSac || null,
          quantity: l.quantity,
          unitPricePaise: l.unitPricePaise,
          discountPct: l.discountPct,
          taxRatePct: l.taxRatePct,
          amountPaise: computeLine(l).taxablePaise,
          position: l.position,
        }))
      );
    });

    const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId!));
    await audit(viewer, d.id ? 'invoice.updated' : 'invoice.created', { entityType: 'invoice', entityId: inv.id, metadata: { number: inv.number, totalPaise: inv.totalPaise, status: inv.status } });
    if (inv.status !== 'draft' && wasDraft) await announceInvoice(viewer, inv);
    target = inv.id;
    revalidatePath('/portal/invoices');
    return { ok: true };
  });
  if (target) redirect(`/portal/invoices/${target}`);
  return result;
}

function pick(d: z.infer<typeof invoiceSchema>) {
  return {
    projectId: d.projectId,
    issueDate: d.issueDate,
    dueDate: d.dueDate,
    billingName: d.billingName,
    billingAddress: d.billingAddress,
    billingGstin: d.billingGstin,
    placeOfSupply: d.placeOfSupply,
    notes: d.notes,
    terms: d.terms,
  };
}

async function announceInvoice(viewer: Viewer, inv: typeof invoices.$inferSelect) {
  await audit(viewer, 'invoice.sent', { entityType: 'invoice', entityId: inv.id, metadata: { number: inv.number } });
  await recordActivity({ entityType: 'invoice', entityId: inv.id, clientId: inv.clientId, projectId: inv.projectId, actorId: viewer.id, summary: `Invoice ${inv.number} issued for ${formatINR(inv.totalPaise)}`, visibility: 'client' });
  await notifyUsers(await clientUserIds(inv.clientId), { type: 'invoice.created', title: `Invoice ${inv.number} issued`, body: `${formatINR(inv.totalPaise)} due by ${inv.dueDate}`, link: `/portal/invoices/${inv.id}`, priority: 'high' }, { actorId: viewer.id });
}

export async function sendInvoiceAction(id: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'invoices.manage');
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!inv || inv.status !== 'draft') return { error: 'Only draft invoices can be sent.' };
    const status = deriveInvoiceStatus({ ...inv, status: 'sent' });
    await db.update(invoices).set({ status, sentAt: new Date() }).where(eq(invoices.id, id));
    await announceInvoice(viewer, { ...inv, status });
    revalidatePath(`/portal/invoices/${id}`);
    return { ok: true, message: 'Invoice sent to the client portal.' };
  });
}

export async function cancelInvoiceAction(id: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'invoices.manage');
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!inv) return { error: 'Invoice not found.' };
    if (inv.paidPaise > 0) return { error: 'This invoice has payments recorded and can’t be cancelled. Issue a credit note instead.' };
    await db.update(invoices).set({ status: 'cancelled' }).where(eq(invoices.id, id));
    await audit(viewer, 'invoice.cancelled', { entityType: 'invoice', entityId: id, metadata: { number: inv.number } });
    if (inv.status !== 'draft') await recordActivity({ entityType: 'invoice', entityId: id, clientId: inv.clientId, actorId: viewer.id, summary: `Invoice ${inv.number} cancelled`, visibility: 'client' });
    revalidatePath(`/portal/invoices/${id}`);
    return { ok: true, message: 'Invoice cancelled.' };
  });
}

const paymentSchema = z.object({
  invoiceId: z.uuid(),
  amount: z.string().transform((v) => rupeesToPaise(v)).refine((v) => v > 0, 'Enter an amount.'),
  paidOn: z.iso.date('Choose the payment date.'),
  method: z.enum(['bank_transfer', 'upi', 'card', 'cheque', 'cash', 'other']),
  reference: z.string().trim().max(120).optional().transform((v) => v || null),
  notes: z.string().trim().max(500).optional().transform((v) => v || null),
});

export async function recordPaymentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'payments.record');
    const parsed = parseForm(paymentSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;

    const outcome = await db.transaction(async (tx) => {
      // Lock the invoice row so concurrent payments can't over-pay it.
      const [inv] = await tx.select().from(invoices).where(eq(invoices.id, d.invoiceId)).for('update');
      if (!inv) return { error: 'Invoice not found.' } as const;
      if (inv.status === 'draft' || inv.status === 'cancelled') return { error: 'Payments can only be recorded against issued invoices.' } as const;
      const due = inv.totalPaise - inv.paidPaise;
      if (d.amount > due) return { error: `That’s more than the ${formatINR(due)} balance due.` } as const;
      await tx.insert(payments).values({ invoiceId: inv.id, clientId: inv.clientId, amountPaise: d.amount, paidOn: d.paidOn, method: d.method, reference: d.reference, notes: d.notes, recordedBy: viewer.id });
      const paid = inv.paidPaise + d.amount;
      const status = deriveInvoiceStatus({ ...inv, paidPaise: paid });
      await tx.update(invoices).set({ paidPaise: sql`${invoices.paidPaise} + ${d.amount}`, status }).where(eq(invoices.id, inv.id));
      return { inv, paid, status } as const;
    });
    if ('error' in outcome) return { error: outcome.error };

    const { inv, status } = outcome;
    await audit(viewer, 'payment.recorded', { entityType: 'invoice', entityId: inv.id, metadata: { amountPaise: d.amount, method: d.method, reference: d.reference } });
    const summary = `Payment of ${formatINR(d.amount)} received for ${inv.number}${status === 'paid' ? ' — paid in full' : ''}`;
    await recordActivity({ entityType: 'invoice', entityId: inv.id, clientId: inv.clientId, projectId: inv.projectId, actorId: viewer.id, summary, visibility: 'client' });
    await notifyUsers(await clientUserIds(inv.clientId), { type: 'payment.recorded', title: 'Payment recorded', body: summary, link: `/portal/invoices/${inv.id}` }, { actorId: viewer.id });
    revalidatePath(`/portal/invoices/${inv.id}`);
    revalidatePath('/portal/invoices');
    return { ok: true, message: 'Payment recorded.' };
  });
}

