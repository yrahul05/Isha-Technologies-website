import 'server-only';
import { sendEmail } from '@/lib/email';
import { appUrl } from '@/server/request';

/**
 * Reusable, branded system emails. Every message shares one layout: the
 * Isha Technologies wordmark, a category line (Account Security, Password
 * Reset, Meeting Notification…), a heading, body, optional detail rows and
 * a single call to action. Sent from the configured business address
 * (EMAIL_FROM, e.g. "Isha Technologies <hello@ishatechnologies.in>").
 */
export type EmailCategory =
  | 'Account Security'
  | 'Password Reset'
  | 'Account Invitation'
  | 'Meeting Notification'
  | 'Invoice Notification'
  | 'Task Notification'
  | 'Project Update'
  | 'Support'
  | 'Announcement'
  | 'Notification';

type Template = {
  category: EmailCategory;
  title: string;
  intro: string;
  rows?: [string, string][];
  code?: string;
  cta?: { label: string; href: string };
  footnote?: string;
};

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function renderEmail(t: Template): { subject: string; html: string; text: string } {
  const href = t.cta ? (t.cta.href.startsWith('http') ? t.cta.href : `${appUrl()}${t.cta.href}`) : null;
  const rows = (t.rows ?? []).filter(([, v]) => v);
  const html = `<!doctype html><html><body style="margin:0;background:#f5f8fd;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <tr><td style="height:5px;background:#3478e4;"></td></tr>
    <tr><td style="padding:28px 28px 8px;">
      <p style="margin:0;font-size:18px;font-weight:800;letter-spacing:.02em;color:#0f172a;">Isha <span style="color:#3478e4;">Technologies</span></p>
      <p style="margin:18px 0 0;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3478e4;">${esc(t.category)}</p>
      <h1 style="margin:6px 0 0;font-size:20px;line-height:1.3;color:#0f172a;">${esc(t.title)}</h1>
      <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap;">${esc(t.intro)}</p>
    </td></tr>
    ${t.code ? `<tr><td style="padding:16px 28px 0;"><p style="margin:0;display:inline-block;padding:14px 22px;border-radius:12px;background:#eef4fd;border:1px solid #cfe0fa;font-size:28px;font-weight:800;letter-spacing:.35em;color:#0f172a;font-family:'Courier New',monospace;">${esc(t.code)}</p></td></tr>` : ''}
    ${rows.length ? `<tr><td style="padding:16px 28px 0;"><table role="presentation" width="100%" style="border-collapse:collapse;">${rows.map(([k, v]) => `<tr><td style="padding:6px 0;width:130px;font-size:13px;color:#64748b;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">${esc(v)}</td></tr>`).join('')}</table></td></tr>` : ''}
    ${href && t.cta ? `<tr><td style="padding:22px 28px 0;"><a href="${esc(href)}" style="display:inline-block;background:#3478e4;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:9px;font-size:14px;font-weight:700;">${esc(t.cta.label)}</a></td></tr>` : ''}
    <tr><td style="padding:22px 28px 26px;">
      ${t.footnote ? `<p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:#64748b;">${esc(t.footnote)}</p>` : ''}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 12px;" />
      <p style="margin:0;font-size:12px;color:#3478e4;font-weight:700;">Build. Scale. Automate.</p>
      <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">Isha Technologies · www.ishatechnologies.in · This is an automated message from your client portal.</p>
    </td></tr>
  </table></body></html>`;
  const text = [
    `Isha Technologies — ${t.category}`,
    '',
    t.title,
    '',
    t.intro,
    t.code ? `\nCode: ${t.code}` : '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    href && t.cta ? `\n${t.cta.label}: ${href}` : '',
    t.footnote ? `\n${t.footnote}` : '',
    '\n— Isha Technologies · Build. Scale. Automate.',
  ]
    .filter((l) => l !== '')
    .join('\n');
  return { subject: `${t.title} · Isha Technologies`, html, text };
}

export function emailConfigured(): boolean {
  return Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Sends a templated email. When email isn't configured in development the
 * message is written to the server console instead (never to a browser);
 * in production an unconfigured provider returns false.
 */
export async function sendTemplate(to: string, t: Template): Promise<boolean> {
  const { subject, html, text } = renderEmail(t);
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== 'production') console.info(`[portal email → ${to}] ${subject}\n${text}\n`);
    else console.info('[portal] email is optional and not configured — skipped:', subject);
    return false;
  }
  const r = await sendEmail({ to, from: process.env.EMAIL_FROM!, subject, text, html }).catch(() => ({ ok: false }));
  return r.ok;
}
