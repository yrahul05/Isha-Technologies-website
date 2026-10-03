import 'server-only';
import { sendTemplate } from '@/server/email/templates';

/**
 * Sends an invitation / link-based account email through the branded
 * templates. When email isn't configured (local development) the message
 * is printed to the server console — never returned to an unauthenticated
 * browser.
 */
export async function deliverAuthEmail(to: string, subject: string, link: string, cta: string, body: string): Promise<boolean> {
  return sendTemplate(to, {
    category: /invit/i.test(subject) ? 'Account Invitation' : 'Password Reset',
    title: subject,
    intro: body,
    cta: { label: cta, href: link },
    footnote: 'If you weren’t expecting this email, you can safely ignore it.',
  });
}
