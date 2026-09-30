import 'server-only';
import { sendEmail } from '@/lib/email';
import { portalEmailHtml } from '@/server/notify';

/**
 * Sends a password-reset / invitation email. When email isn't configured
 * (local development) the link is printed to the server console instead,
 * never returned to an unauthenticated browser.
 */
export async function deliverAuthEmail(to: string, subject: string, link: string, cta: string, body: string): Promise<boolean> {
  const from = process.env.EMAIL_FROM;
  if (!process.env.EMAIL_API_KEY || !from) {
    if (process.env.NODE_ENV !== 'production') console.info(`[portal] ${subject} for ${to}: ${link}`);
    else console.error('[portal] EMAIL_API_KEY/EMAIL_FROM not configured — auth email not sent');
    return false;
  }
  const result = await sendEmail({ to, from, subject, text: `${body}\n\n${link}`, html: portalEmailHtml(subject, body, link, cta) });
  return result.ok;
}
