import type { Metadata } from 'next';
import Link from 'next/link';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { Bell } from 'lucide-react';
import { db } from '@/server/db';
import { notifications } from '@/server/db/schema';
import { requireViewer } from '@/server/auth/viewer';
import { EmptyState, PageHeader, Pagination, Panel, StatusBadge } from '@/components/portal/ui';
import { MarkAllReadButton, NotificationRowActions } from '@/components/portal/comms/CommsForms';
import { fmtDateTime, relativeTime } from '@/lib/portal/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Notifications' };
const PAGE = 30;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string; unread?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const unreadOnly = sp.unread === '1';
  const where = and(eq(notifications.userId, viewer.id), unreadOnly ? isNull(notifications.readAt) : undefined);

  const [rows, [{ n }]] = await Promise.all([
    db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(PAGE).offset((page - 1) * PAGE),
    db.select({ n: count() }).from(notifications).where(where),
  ]);

  return (
    <>
      <PageHeader eyebrow="Inbox" title="Notifications" description="Your complete notification history. New important notifications play a sound while you're signed in." actions={<MarkAllReadButton />} />
      <div className="mb-4 flex gap-1">
        {[
          { href: '/portal/notifications', label: 'All', active: !unreadOnly },
          { href: '/portal/notifications?unread=1', label: 'Unread', active: unreadOnly },
        ].map((f) => (
          <Link key={f.label} href={f.href} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', f.active ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-50')}>
            {f.label}
          </Link>
        ))}
      </div>
      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={Bell} title={unreadOnly ? 'No unread notifications' : 'No notifications yet'} />
        ) : (
          <ul className="-my-2 divide-y divide-gray-100">
            {rows.map((n) => (
              <li key={n.id} className={cn('flex items-start gap-3 py-3', !n.readAt && 'bg-brand/[0.03] -mx-5 px-5')}>
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-slate-200' : n.priority === 'urgent' ? 'bg-rose-500' : 'bg-brand')} />
                <div className="min-w-0 flex-1">
                  <Link href={n.link ?? '#'} className={cn('text-sm hover:text-brand', n.readAt ? 'text-slate-700' : 'font-semibold text-slate-900')}>
                    {n.title}
                  </Link>
                  {n.body && <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-slate-400" title={fmtDateTime(n.createdAt)}>
                    {relativeTime(n.createdAt)}
                  </p>
                </div>
                {(n.priority === 'high' || n.priority === 'urgent') && <StatusBadge status={n.priority} />}
                <NotificationRowActions id={n.id} read={Boolean(n.readAt)} />
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pageSize={PAGE} total={n} hrefFor={(p) => `/portal/notifications?page=${p}${unreadOnly ? '&unread=1' : ''}`} />
      </Panel>
    </>
  );
}
