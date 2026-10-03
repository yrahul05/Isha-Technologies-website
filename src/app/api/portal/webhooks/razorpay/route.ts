import { NextResponse } from 'next/server';
import { creditGatewayPayment, verifyRazorpaySignature } from '@/server/payments/gateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Payload = {
  event?: string;
  payload?: {
    payment_link?: { entity?: { id?: string; amount?: number; currency?: string; status?: string } };
    payment?: { entity?: { id?: string; amount?: number; currency?: string; status?: string } };
  };
};

/** POST /api/portal/webhooks/razorpay — authenticated by HMAC signature over the raw body, not by session. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyRazorpaySignature(raw, request.headers.get('x-razorpay-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }
  let body: Payload;
  try {
    body = JSON.parse(raw) as Payload;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if (body.event !== 'payment_link.paid') return NextResponse.json({ ok: true, ignored: body.event ?? null });

  const link = body.payload?.payment_link?.entity;
  const payment = body.payload?.payment?.entity;
  if (!link?.id || !payment?.id || typeof payment.amount !== 'number' || !payment.currency) return NextResponse.json({ error: 'incomplete payload' }, { status: 400 });

  try {
    const result = await creditGatewayPayment({ provider: 'razorpay', providerOrderId: link.id, providerPaymentId: payment.id, amountMinor: payment.amount, currency: payment.currency });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('razorpay webhook failed', error instanceof Error ? error.message : error);
    // A 5xx makes Razorpay retry, which is what we want for transient database errors.
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}
