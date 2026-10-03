import 'server-only';
import { createHmac } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { invoices, paymentOrders, payments } from '@/server/db/schema';
import { audit, recordActivity } from '@/server/audit';
import { clientUserIds, notifyUsers, usersWithPermission } from '@/server/notify';
import { safeEqual } from '@/server/security/crypto';
import { deriveInvoiceStatus, formatMoney } from '@/lib/portal/invoice-math';
import { todayIST } from '@/lib/portal/format';

/**
 * Online invoice payments.
 *
 * Both providers use hosted, redirect-based checkout, so card / UPI / netbanking
 * details never touch this server (PCI scope stays with the provider):
 *   • Razorpay Payment Links — INR
 *   • Stripe Checkout Sessions — USD / CAD (and INR if Razorpay isn't configured)
 *
 * An invoice is credited ONLY by a provider webhook whose signature verifies
 * and whose amount/currency match the stored order — never by the browser
 * returning from checkout. Crediting is idempotent (row lock + status check).
 */
export type Provider = 'razorpay' | 'stripe';

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET);
}
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

/** Which provider can take this currency right now (null = online payment unavailable). */
export function providerFor(currency: string): Provider | null {
  if (currency === 'INR') return razorpayConfigured() ? 'razorpay' : stripeConfigured() ? 'stripe' : null;
  return stripeConfigured() ? 'stripe' : null;
}

export type CheckoutRequest = { orderRef: string; invoiceNumber: string; amountMinor: number; currency: string; description: string; returnUrl: string; customerEmail?: string };

export async function createCheckout(provider: Provider, req: CheckoutRequest): Promise<{ providerOrderId: string; url: string }> {
  return provider === 'razorpay' ? razorpayLink(req) : stripeSession(req);
}

async function razorpayLink(req: CheckoutRequest) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: req.amountMinor,
      currency: req.currency,
      accept_partial: false,
      reference_id: req.orderRef,
      description: req.description.slice(0, 200),
      customer: req.customerEmail ? { email: req.customerEmail } : undefined,
      notify: { sms: false, email: false },
      callback_url: req.returnUrl,
      callback_method: 'get',
      notes: { order_ref: req.orderRef, invoice: req.invoiceNumber },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; short_url?: string; error?: { description?: string } };
  if (!res.ok || !json.id || !json.short_url) throw new Error(`Razorpay: ${json.error?.description ?? res.status}`);
  return { providerOrderId: json.id, url: json.short_url };
}

async function stripeSession(req: CheckoutRequest) {
  const body = new URLSearchParams({
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': req.currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(req.amountMinor),
    'line_items[0][price_data][product_data][name]': req.description.slice(0, 200),
    client_reference_id: req.orderRef,
    'metadata[order_ref]': req.orderRef,
    'payment_intent_data[metadata][order_ref]': req.orderRef,
    success_url: `${req.returnUrl}${req.returnUrl.includes('?') ? '&' : '?'}paid=1`,
    cancel_url: req.returnUrl,
  });
  if (req.customerEmail) body.set('customer_email', req.customerEmail);
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !json.id || !json.url) throw new Error(`Stripe: ${json.error?.message ?? res.status}`);
  return { providerOrderId: json.id, url: json.url };
}

// ---------------------------------------------------------------------------
// Webhook signature verification (raw body required)
// ---------------------------------------------------------------------------
export function verifyRazorpaySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqual(createHmac('sha256', secret).update(rawBody).digest('hex'), signature);
}

/** Stripe-Signature: t=timestamp,v1=hmac(`${t}.${body}`). Rejects replays older than 5 minutes. */
export function verifyStripeSignature(rawBody: string, header: string | null, now = Date.now()): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(now / 1000 - t) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  return header
    .split(',')
    .filter((p) => p.startsWith('v1='))
    .some((p) => safeEqual(p.slice(3), expected));
}

// ---------------------------------------------------------------------------
// Crediting
// ---------------------------------------------------------------------------
export type GatewayConfirmation = { provider: Provider; providerOrderId: string; providerPaymentId: string; amountMinor: number; currency: string };

/**
 * Credit the invoice for a verified provider payment. Safe to call twice
 * (webhooks retry): the second call finds the order already paid.
 */
export async function creditGatewayPayment(c: GatewayConfirmation): Promise<'credited' | 'duplicate' | 'unknown_order' | 'mismatch'> {
  const outcome = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(paymentOrders).where(eq(paymentOrders.providerOrderId, c.providerOrderId)).for('update');
    if (!order || order.provider !== c.provider) return { kind: 'unknown_order' } as const;
    if (order.status === 'paid') return { kind: 'duplicate' } as const;
    if (order.amountMinor !== c.amountMinor || order.currency.toUpperCase() !== c.currency.toUpperCase()) {
      await tx.update(paymentOrders).set({ status: 'failed', providerPaymentId: c.providerPaymentId }).where(eq(paymentOrders.id, order.id));
      return { kind: 'mismatch', order } as const;
    }
    const [inv] = await tx.select().from(invoices).where(eq(invoices.id, order.invoiceId)).for('update');
    const [pay] = await tx
      .insert(payments)
      .values({ invoiceId: order.invoiceId, clientId: order.clientId, amountPaise: order.amountMinor, paidOn: todayIST(), method: c.provider === 'stripe' ? 'card' : 'other', reference: `${c.provider}:${c.providerPaymentId}`, notes: 'Paid online' })
      .returning({ id: payments.id });
    const paid = inv.paidPaise + order.amountMinor;
    const status = deriveInvoiceStatus({ ...inv, paidPaise: paid });
    await tx.update(invoices).set({ paidPaise: sql`${invoices.paidPaise} + ${order.amountMinor}`, status }).where(eq(invoices.id, inv.id));
    await tx.update(paymentOrders).set({ status: 'paid', providerPaymentId: c.providerPaymentId, paymentId: pay.id }).where(eq(paymentOrders.id, order.id));
    return { kind: 'credited', order, inv, status } as const;
  });

  if (outcome.kind === 'mismatch') {
    await audit(null, 'payment.online_captured', { entityType: 'invoice', entityId: outcome.order.invoiceId, metadata: { rejected: 'amount_or_currency_mismatch', expected: outcome.order.amountMinor, got: c.amountMinor } });
    return 'mismatch';
  }
  if (outcome.kind !== 'credited') return outcome.kind;

  const { order, inv, status } = outcome;
  const summary = `Online payment of ${formatMoney(order.amountMinor, order.currency)} received for ${inv.number}${status === 'paid' ? ' — paid in full' : ''}`;
  await audit(null, 'payment.online_captured', { entityType: 'invoice', entityId: inv.id, metadata: { provider: c.provider, providerPaymentId: c.providerPaymentId, amountMinor: order.amountMinor, currency: order.currency } });
  await recordActivity({ entityType: 'invoice', entityId: inv.id, clientId: inv.clientId, projectId: inv.projectId, summary, visibility: 'client' });
  await notifyUsers(await clientUserIds(inv.clientId), { type: 'payment.recorded', title: 'Payment received — thank you', body: summary, link: `/portal/invoices/${inv.id}` });
  await notifyUsers(await usersWithPermission('invoices.manage'), { type: 'payment.recorded', title: `Online payment: ${inv.number}`, body: `${inv.billingName} · ${summary}`, link: `/portal/invoices/${inv.id}`, priority: 'high' });
  return 'credited';
}
