import 'server-only';
import { notifyUsers } from '@/server/notify';
import type { RequestMeta } from '@/server/request';

/**
 * Critical security notice (in-portal + email). Always delivered — users
 * can't switch the security category off.
 */
export async function notifySecurity(user: { id: string }, title: string, body: string, meta?: RequestMeta) {
  const when = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  await notifyUsers(
    [user.id],
    {
      type: 'security.account',
      title,
      body,
      link: '/portal/settings?section=security',
      priority: 'urgent',
      details: [
        ['When', `${when} IST`],
        ['IP address', meta?.ip ?? '—'],
      ],
    },
    { includeActor: true }
  );
}
