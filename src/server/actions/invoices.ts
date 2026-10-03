'use server';

import { randomBytes } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db, type Database } from '@/server/db';
import { clients, invoiceItems, invoices, payments, projects } from '@/server/db/schema';
import { assertCan, ForbiddenError, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { audit, recordActivity } from '@/server/audit';
import { clientUserIds, notifyUsers } from '@/server/notify';
import { getSetting, nextCounter } from '@/server/settings';
import { computeLine, computeTotals, CURRENCY_CODES, deriveInvoiceStatus, formatMoney, isValidGstin, rupeesToPaise } from '@/lib/portal/invoice-math';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const itemSchema = z.object({
  description: z.string().trim().min(1, 'Each line needs a description.').max(500),
  hsnSac: z.string().trim().max(12).optional().default(''),
  quantity: z.coerce.number().positive('Quantity must be positive.').max(1_000_000),
  unitPrice: z.union([z.string(), z.number()]).transform((v) => rupeesToPaise(v)),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxRatePct: z.coerce.number().min(0).max(100).default(0),
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
    currency: z.enum(CURRENCY_CODES as [string, ...string[]]).default('INR'),
    taxMode: z.enum(['gst_auto', 'gst_intra', 'gst_inter', 'custom', 'none']),
    taxLabel: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((v) => v || null),
    paymentProfile: z.enum(['domestic', 'international', 'none']),
    issueDate: z.iso.date('Choose the invoice date.'),
    dueDate: z.iso.date('Choose the due date.'),
    billingName: z.string().trim().min(2, 'Enter the billing name.').max(200),
    billingAddress: z.string().trim().max(600).default(''),
    billingGstin: z
      .string()
      .trim()
      .max(30)
      .optional()
      .transform((v) => (v ? v.toUpperCase() : null)),
    placeOfSupply: z
      .string()
      .regex(/^\d{2}$/)
      .optional()
      .or(z.literal(''))
      .transform((v) => v || null),
    notes: z.string().max(2000).default(''),
    terms: z.string().max(4000).default(''),
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
  .refine((d) => d.dueDate >= d.issueDate, { path: ['dueDate'], message: 'Due date must be on or after the invoice date.' })
  // Indian GST applies to INR invoices only; USD/CAD use a custom tax or none.
  .refine((d) => d.currency === 'INR' || !d.taxMode.startsWith('gst'), { path: ['taxMode'], message: 'GST applies to INR invoices. Choose custom tax or no tax for USD/CAD.' })
  .refine((d) => d.currency !== 'INR' || !d.taxMode.startsWith('gst') || !d.billingGstin || isValidGstin(d.billingGstin), { path: ['billingGstin'], message: 'That GSTIN doesn’t look valid.' });

type InvoiceInput = z.infer<typeof invoiceSchema>;

/**
 * Permanent, sequential number (e.g. ISH-2026-0001), assigned atomically
 * when an invoice is first issued. Drafts carry a DRAFT- placeholder so
 * they never consume a number; a database trigger forbids changing a
 * number once issued, and a unique index forbids duplicates.
 */
async function assignInvoiceNumber(tx: Pick<Database, 'insert'>, issueDate: string): Promise<string> {
  const { prefix } = await getSetting('invoice');
  const year = issueDate.slice(0, 4);
  const seq = await nextCounter(`invoice:${prefix}:${year}`, tx);
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

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
    // Tax rates come from Admin Settings — GST slabs for INR, free rate for custom tax, none otherwise.
    const tax = await getSetting('tax');
    const lines = d.items.map((it, i) => ({ ...it, unitPricePaise: it.unitPrice, position: i, taxRatePct: d.taxMode === 'none' ? 0 : it.taxRatePct }));
    if (d.taxMode.startsWith('gst') && lines.some((l) => !tax.gstRates.includes(l.taxRatePct))) {
      return { error: `GST rates must be one of the configured slabs: ${tax.gstRates.join('%, ')}%.` };
    }
    const totals = computeTotals(lines);
    if (totals.totalPaise <= 0) return { error: 'The invoice total must be greater than zero.' };

    let invoiceId = d.id || null;
    let newlyIssued = false;
    await db.transaction(async (tx) => {
      if (invoiceId) {
        const [existing] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for('update');
        if (!existing) throw new ForbiddenError('Invoice not found.');
        if (existing.status === 'cancelled') throw new ForbiddenError('Cancelled invoices can’t be edited.');
        if (existing.clientId !== d.clientId) throw new ForbiddenError('An invoice cannot be moved to another client.');
        if (existing.status !== 'draft' && existing.currency !== d.currency) throw new ForbiddenError('The currency of an issued invoice can’t be changed.');
        if (totals.totalPaise < existing.paidPaise) throw new ForbiddenError(`The total can’t be less than the ${formatMoney(existing.paidPaise, existing.currency)} already paid.`);
        const issuing = existing.status === 'draft' && d.intent === 'send';
        const stays = existing.status === 'draft' && !issuing;
        const status = stays ? 'draft' : deriveInvoiceStatus({ status: 'sent', totalPaise: totals.totalPaise, paidPaise: existing.paidPaise, dueDate: d.dueDate });
        await tx
          .update(invoices)
          .set({
            ...pick(d),
            ...totals,
            status,
            // An issued number is never touched; a draft gets its number exactly once, on issue.
            ...(issuing ? { number: await assignInvoiceNumber(tx, d.issueDate), sentAt: new Date() } : {}),
          })
          .where(eq(invoices.id, invoiceId));
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
        newlyIssued = issuing;
      } else {
        const issuing = d.intent === 'send';
        const [row] = await tx
          .insert(invoices)
          .values({
            ...pick(d),
            ...totals,
            number: issuing ? await assignInvoiceNumber(tx, d.issueDate) : `DRAFT-${randomBytes(4).toString('hex').toUpperCase()}`,
            clientId: d.clientId,
            status: issuing ? 'sent' : 'draft',
            sentAt: issuing ? new Date() : null,
            createdBy: viewer.id,
          })
          .returning({ id: invoices.id });
        invoiceId = row.id;
        newlyIssued = issuing;
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
    await audit(viewer, d.id ? 'invoice.updated' : 'invoice.created', { entityType: 'invoice', entityId: inv.id, metadata: { number: inv.number, currency: inv.currency, totalMinor: inv.totalPaise, status: inv.status } });
    if (newlyIssued) await announceInvoice(viewer, inv);
    target = inv.id;
    revalidatePath('/portal/invoices');
    return { ok: true };
  });
  if (target) redirect(`/portal/invoices/${target}`);
  return result;
}

function pick(d: InvoiceInput) {
  return {
    projectId: d.projectId,
    currency: d.currency,
    taxMode: d.taxMode,
    taxLabel: d.taxMode === 'custom' ? d.taxLabel || 'Tax' : null,
    paymentProfile: d.paymentProfile,
    issueDate: d.issueDate,
    dueDate: d.dueDate,
    billingName: d.billingName,
    billingAddress: d.billingAddress,
    billingGstin: d.billingGstin,
    placeOfSupply: d.currency === 'INR' ? d.placeOfSupply : null,
    notes: d.notes,
    terms: d.terms,
  };
}

async function announceInvoice(viewer: Viewer, inv: typeof invoices.$inferSelect) {
  const total = formatMoney(inv.totalPaise, inv.currency);
  await audit(viewer, 'invoice.sent', { entityType: 'invoice', entityId: inv.id, metadata: { number: inv.number } });
  await recordActivity({ entityType: 'invoice', entityId: inv.id, clientId: inv.clientId, projectId: inv.projectId, actorId: viewer.id, summary: `Invoice ${inv.number} issued for ${total}`, visibility: 'client' });
  await notifyUsers(await clientUserIds(inv.clientId), { type: 'invoice.created', title: `Invoice ${inv.number} issued`, body: `${total} due by ${inv.dueDate}`, link: `/portal/invoices/${inv.id}`, priority: 'high' }, { actorId: viewer.id });
}

export async function sendInvoiceAction(id: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'invoices.manage');
    const updated = await db.transaction(async (tx) => {
      const [inv] = await tx.select().from(invoices).where(eq(invoices.id, id)).for('update');
      if (!inv || inv.status !== 'draft') return null;
      const status = deriveInvoiceStatus({ ...inv, status: 'sent' });
      const number = await assignInvoiceNumber(tx, inv.issueDate);
      const [row] = await tx.update(invoices).set({ status, number, sentAt: new Date() }).where(eq(invoices.id, id)).returning();
      return row;
    });
    if (!updated) return { error: 'Only draft invoices can be sent.' };
    await announceInvoice(viewer, updated);
    revalidatePath(`/portal/invoices/${id}`);
    return { ok: true, message: `Issued as ${updated.number} and shared with the client.` };
  });
}

export async function cancelInvoiceAction(id: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'invoices.manage');
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!inv) return { error: 'Invoice not found.' };
    if (inv.paidPaise > 0) return { error: 'This invoice has payments recorded and can’t be cancelled. Issue a credit note instead.' };
    // Invoices are never deleted (enforced by a database trigger) — cancelled ones stay in history.
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
      if (d.amount > due) return { error: `That’s more than the ${formatMoney(due, inv.currency)} balance due.` } as const;
      await tx.insert(payments).values({ invoiceId: inv.id, clientId: inv.clientId, amountPaise: d.amount, paidOn: d.paidOn, method: d.method, reference: d.reference, notes: d.notes, recordedBy: viewer.id });
      const paid = inv.paidPaise + d.amount;
      const status = deriveInvoiceStatus({ ...inv, paidPaise: paid });
      await tx.update(invoices).set({ paidPaise: sql`${invoices.paidPaise} + ${d.amount}`, status }).where(eq(invoices.id, inv.id));
      return { inv, paid, status } as const;
    });
    if ('error' in outcome) return { error: outcome.error };

    const { inv, status } = outcome;
    await audit(viewer, 'payment.recorded', { entityType: 'invoice', entityId: inv.id, metadata: { amountMinor: d.amount, currency: inv.currency, method: d.method, reference: d.reference } });
    const summary = `Payment of ${formatMoney(d.amount, inv.currency)} received for ${inv.number}${status === 'paid' ? ' — paid in full' : ''}`;
    await recordActivity({ entityType: 'invoice', entityId: inv.id, clientId: inv.clientId, projectId: inv.projectId, actorId: viewer.id, summary, visibility: 'client' });
    await notifyUsers(await clientUserIds(inv.clientId), { type: 'payment.recorded', title: 'Payment recorded', body: summary, link: `/portal/invoices/${inv.id}` }, { actorId: viewer.id });
    revalidatePath(`/portal/invoices/${inv.id}`);
    revalidatePath('/portal/invoices');
    return { ok: true, message: 'Payment recorded.' };
  });
}
