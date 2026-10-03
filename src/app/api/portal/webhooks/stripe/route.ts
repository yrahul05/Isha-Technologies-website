import { NextResponse } from 'next/server';
import { creditGatewayPayment, verifyStripeSignature } from '@/server/payments/gateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StripeEvent = {
  type?: string;
  data?: { object?: { id?: string; payment_status?: string; amount_total?: number; currency?: string; payment_intent?: string } };
};

/** POST /api/portal/webhooks/stripe — authenticated by the Stripe-Signature HMAC over the raw body. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get('stripe-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }
  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return NextResponse.json({ ok: true, ignored: event.type ?? null });

  const session = event.data?.object;
  if (!session?.id || typeof session.amount_total !== 'number' || !session.currency) return NextResponse.json({ error: 'incomplete payload' }, { status: 400 });
  // Delayed payment methods complete the session before the money arrives; wait for the success event.
  if (session.payment_status !== 'paid') return NextResponse.json({ ok: true, ignored: `payment_status=${session.payment_status}` });

  try {
    const result = await creditGatewayPayment({ provider: 'stripe', providerOrderId: session.id, providerPaymentId: session.payment_intent ?? session.id, amountMinor: session.amount_total, currency: session.currency });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('stripe webhook failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}
