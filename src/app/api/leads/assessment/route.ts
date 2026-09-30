import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createWebsiteLead, cleanAttribution } from '@/server/leads';
import { consumeRateLimit } from '@/server/auth/throttle';
import { isSameOrigin, metaFromHeaders } from '@/server/request';
import { isValidEmail, sanitizeText, sendEmail } from '@/lib/email';
import { ASSESSMENT } from '@/lib/portal/assessment';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 20_000;
const oneOf = <T extends readonly string[]>(values: T) => z.enum(values as unknown as [string, ...string[]], { message: 'Please choose one of the options.' });

const schema = z.object({
  name: z.string().transform((v) => sanitizeText(v, 100)).pipe(z.string().min(2, 'Please enter your name.')),
  email: z.string().transform((v) => sanitizeText(v, 254).toLowerCase()).refine(isValidEmail, 'Please enter a valid work email.'),
  phone: z.string().optional().transform((v) => sanitizeText(v ?? '', 30)).refine((v) => !v || /^[+\d][\d\s()-]{6,}$/.test(v), 'Please enter a valid phone number.'),
  company: z.string().optional().transform((v) => sanitizeText(v ?? '', 150)),
  currentCloud: oneOf(ASSESSMENT.clouds),
  infrastructure: z.array(oneOf(ASSESSMENT.infrastructure)).min(1, 'Select at least one.').max(ASSESSMENT.infrastructure.length),
  monthlySpend: oneOf(ASSESSMENT.spend),
  deploymentFrequency: oneOf(ASSESSMENT.deployFrequency),
  problems: z.array(oneOf(ASSESSMENT.problems)).max(ASSESSMENT.problems.length).default([]),
  problemDetails: z.string().optional().transform((v) => sanitizeText(v ?? '', 2000)),
  companySize: oneOf(ASSESSMENT.companySize),
  consent: z.literal(true, { message: 'Please agree so we can contact you.' }),
  website: z.string().optional(), // honeypot
  attribution: z.unknown().optional(),
});

/**
 * POST /api/leads/assessment — public Free DevOps & Cloud Assessment.
 * Validates, rate-limits per IP (DB-backed), then creates + assigns a CRM
 * lead, records activity, notifies the team in-portal and by email, and
 * confirms to the prospect. Honeypot hits get a silent success.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: 'Request too large.' }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }
  if (typeof (body as { website?: unknown }).website === 'string' && (body as { website: string }).website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return NextResponse.json({ ok: false, fieldErrors }, { status: 400 });
  }

  try {
    const meta = metaFromHeaders(request.headers);
    if (!(await consumeRateLimit('assessment', meta.ip, 5, 10 * 60 * 1000))) {
      return NextResponse.json({ ok: false, error: 'Too many submissions. Please try again in a few minutes.' }, { status: 429 });
    }
    const d = parsed.data;
    const assessment = {
      currentCloud: d.currentCloud,
      infrastructure: d.infrastructure,
      monthlySpend: d.monthlySpend,
      deploymentFrequency: d.deploymentFrequency,
      problems: d.problems,
      problemDetails: d.problemDetails,
      companySize: d.companySize,
    };
    const lead = await createWebsiteLead({
      source: 'website_assessment',
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      company: d.company || null,
      serviceInterested: d.problems[0] ?? 'Free DevOps & Cloud Assessment',
      notes: d.problemDetails,
      assessment,
      attribution: cleanAttribution(d.attribution),
    });

    const from = process.env.EMAIL_FROM;
    if (process.env.EMAIL_API_KEY && from) {
      const summary = Object.entries(assessment)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n');
      if (process.env.CONTACT_EMAIL) {
        await sendEmail({ to: process.env.CONTACT_EMAIL, from, replyTo: d.email, subject: `New Cloud Assessment — ${d.company || d.name}`, text: `${d.name} <${d.email}> ${d.phone}\n\n${summary}`, html: `<pre style="font-family:Arial">${escape(`${d.name} <${d.email}> ${d.phone}\n\n${summary}`)}</pre>` }).catch(() => undefined);
      }
      await sendEmail({
        to: d.email,
        from,
        subject: 'Your Free DevOps & Cloud Assessment — Isha Technologies',
        text: `Hi ${d.name.split(' ')[0]},\n\nThanks for requesting a Free DevOps & Cloud Assessment. A cloud engineer will review your answers and reach out within one business day with next steps.\n\nRegards,\nIsha Technologies\nBuild. Scale. Automate.`,
        html: `<p>Hi ${escape(d.name.split(' ')[0])},</p><p>Thanks for requesting a <strong>Free DevOps &amp; Cloud Assessment</strong>. A cloud engineer will review your answers and reach out within one business day with next steps.</p><p>Regards,<br/>Isha Technologies</p><p style="color:#3478e4;font-weight:600">Build. Scale. Automate.</p>`,
      }).catch(() => undefined);
    }
    return NextResponse.json({ ok: true, reference: lead.id.slice(0, 8).toUpperCase() });
  } catch (error) {
    console.error('assessment submission failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: 'We couldn’t save your assessment right now. Please try again or contact us on WhatsApp.' }, { status: 500 });
  }
}

function escape(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
