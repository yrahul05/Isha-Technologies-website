import { contactServiceOptions } from '@/data/contact';
import {
  buildInternalEnquiryEmail,
  buildVisitorConfirmationEmail,
  isValidEmail,
  sanitizeText,
  sendEmail,
} from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';
import { cleanAttribution, createWebsiteLead } from '@/server/leads';
import { NextResponse } from 'next/server';

// Node.js runtime (Vercel's default serverless function runtime) — this
// route just needs reliable access to server-side env vars
// (CONTACT_EMAIL/EMAIL_FROM/EMAIL_API_KEY) and has no need for edge-specific
// capabilities.
export const runtime = 'nodejs';

// Guards against excessively large requests before we even attempt to parse them.
const MAX_BODY_BYTES = 20_000;

function readString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === 'string' ? value : '';
}

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, error: 'Request too large.' }, { status: 413 });
    }

    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, error: 'Request too large.' }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
    }

    // Honeypot — real visitors never see or fill this field. Bots that
    // auto-fill every input do, so treat a non-empty value as spam and
    // pretend success rather than revealing that it was caught.
    const honeypot = readString(body, 'website');
    if (honeypot.trim().length > 0) {
      return NextResponse.json({ success: true });
    }

    const fullName = sanitizeText(readString(body, 'fullName'), 100);
    const company = sanitizeText(readString(body, 'company'), 150);
    const email = sanitizeText(readString(body, 'email'), 254);
    const phone = sanitizeText(readString(body, 'phone'), 30);
    const service = sanitizeText(readString(body, 'service'), 60);
    const platform = sanitizeText(readString(body, 'platform'), 60);
    const timeline = sanitizeText(readString(body, 'timeline'), 60);
    const message = sanitizeText(readString(body, 'message'), 2000);

    const fieldErrors: Record<string, string> = {};
    if (fullName.length < 2) fieldErrors.fullName = 'Please enter your name.';
    if (!isValidEmail(email)) fieldErrors.email = 'Please enter a valid work email.';
    if (!service || !(contactServiceOptions as readonly string[]).includes(service)) {
      fieldErrors.service = 'Please select a service.';
    }
    if (message.length < 10) fieldErrors.message = 'Please tell us a little about your requirements.';

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ success: false, fieldErrors }, { status: 400 });
    }

    const CONTACT_EMAIL = process.env.CONTACT_EMAIL;
    const EMAIL_FROM = process.env.EMAIL_FROM;
    const EMAIL_API_KEY = process.env.EMAIL_API_KEY;

    // Diagnostic only — booleans, never the actual values. Safe to leave in
    // Vercel's function logs; confirms whether these env vars are actually
    // set, without revealing any secret.
    console.log('Contact form env check:', {
      emailApiKeyPresent: Boolean(EMAIL_API_KEY),
      emailFromPresent: Boolean(EMAIL_FROM),
      contactEmailPresent: Boolean(CONTACT_EMAIL),
    });

    const enquiry = { fullName, company, email, phone, service, platform, timeline, message };

    // Also capture the enquiry as a CRM lead (assigned + team notified in
    // the portal). Best-effort when email is configured: a database problem
    // must never stop the enquiry email below from going out.
    let leadSaved = false;
    try {
      await createWebsiteLead({
        source: 'contact_form',
        name: fullName,
        email,
        company: company || null,
        phone: phone || null,
        serviceInterested: service,
        notes: [message, platform && `Cloud platform: ${platform}`, timeline && `Timeline: ${timeline}`].filter(Boolean).join('\n'),
        attribution: cleanAttribution(body.attribution),
      });
      leadSaved = true;
    } catch (leadError) {
      console.error('CRM lead capture failed (enquiry email still sent):', leadError instanceof Error ? leadError.message : leadError);
    }

    // Email is OPTIONAL. Without an email provider the enquiry is still stored as a CRM lead
    // (the team is notified in the portal) and the visitor gets a normal success; only when
    // nothing could be stored either is it an error.
    if (!CONTACT_EMAIL || !EMAIL_FROM || !EMAIL_API_KEY) {
      if (leadSaved) {
        console.info('Contact form: email not configured — enquiry saved as a CRM lead only.');
        return NextResponse.json({ success: true });
      }
      console.error('Contact form: email is not configured and the enquiry could not be saved as a CRM lead.');
      return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 });
    }

    const internalEmail = buildInternalEnquiryEmail(enquiry);
    const internalResult = await sendEmail({
      to: CONTACT_EMAIL,
      from: EMAIL_FROM,
      replyTo: email,
      subject: internalEmail.subject,
      text: internalEmail.text,
      html: internalEmail.html,
    });

    if (!internalResult.ok) {
      console.error('Failed to send internal enquiry email:', internalResult.error);
      return NextResponse.json(
        { success: false, error: 'Unable to send your enquiry right now.' },
        { status: 502 }
      );
    }

    // Autoresponder to the visitor — only attempted after the internal
    // enquiry email above has already succeeded. A failure here is logged
    // but must not turn a successfully-received enquiry into an error for
    // the visitor.
    try {
      const confirmationEmail = buildVisitorConfirmationEmail(enquiry);
      const confirmationResult = await sendEmail({
        to: email,
        from: EMAIL_FROM,
        subject: confirmationEmail.subject,
        text: confirmationEmail.text,
        html: confirmationEmail.html,
      });
      if (!confirmationResult.ok) {
        console.error('Visitor confirmation email failed:', confirmationResult.error);
      }
    } catch (err) {
      console.error('Visitor confirmation email threw:', err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact form submission error:', err);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
