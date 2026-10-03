'use server';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db';
import { clientUsers, invoices, paymentOrders } from '@/server/db/schema';
import { ForbiddenError, requireViewerOrThrow } from '@/server/auth/viewer';
import { invoiceScope } from '@/server/scope';
import { audit } from '@/server/audit';
import { appUrl } from '@/server/request';
import { createCheckout, providerFor } from '@/server/payments/gateway';
import { formatMoney } from '@/lib/portal/invoice-math';
import { guarded } from './helpers';
import type { ActionState } from './types';

/**
 * Start an online payment for the full balance of an invoice the viewer can
 * see. Returns the provider's hosted checkout URL in `data.url`; the invoice
 * is credited later by the verified webhook, not by this call.
 */
export async function startOnlinePaymentAction(invoiceId: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!z.uuid().safeParse(invoiceId).success) throw new ForbiddenError();
    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), invoiceScope(viewer)));
    if (!inv) throw new ForbiddenError('Invoice not found.');
    if (!['sent', 'partially_paid', 'overdue'].includes(inv.status)) return { error: 'This invoice isn’t open for payment.' };
    const due = inv.totalPaise - inv.paidPaise;
    if (due <= 0) return { error: 'Nothing is due on this invoice.' };
    const provider = providerFor(inv.currency);
    if (!provider) return { error: 'Online payment isn’t available for this invoice. Please use the bank details on the invoice.' };

    const [row] = await db
      .insert(paymentOrders)
      .values({ invoiceId: inv.id, clientId: inv.clientId, provider, providerOrderId: `pending-${crypto.randomUUID()}`, amountMinor: due, currency: inv.currency, createdBy: viewer.id })
      .returning({ id: paymentOrders.id });
    try {
      const [member] = viewer.isInternal ? [] : await db.select({ id: clientUsers.userId }).from(clientUsers).where(eq(clientUsers.userId, viewer.id));
      const checkout = await createCheckout(provider, {
        orderRef: row.id,
        invoiceNumber: inv.number,
        amountMinor: due,
        currency: inv.currency,
        description: `Invoice ${inv.number} — ${formatMoney(due, inv.currency)}`,
        returnUrl: `${appUrl()}/portal/invoices/${inv.id}`,
        customerEmail: member ? viewer.email : undefined,
      });
      await db.update(paymentOrders).set({ providerOrderId: checkout.providerOrderId }).where(eq(paymentOrders.id, row.id));
      await audit(viewer, 'payment.online_started', { entityType: 'invoice', entityId: inv.id, metadata: { provider, amountMinor: due, currency: inv.currency } });
      return { ok: true, data: { url: checkout.url } };
    } catch (error) {
      await db.update(paymentOrders).set({ status: 'failed' }).where(eq(paymentOrders.id, row.id));
      console.error('online payment start failed', error instanceof Error ? error.message : error);
      return { error: 'We couldn’t start the online payment. Please try again or use the bank details on the invoice.' };
    }
  });
}
