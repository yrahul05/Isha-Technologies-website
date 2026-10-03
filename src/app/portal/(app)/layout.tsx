import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, count, eq, isNull } from 'drizzle-orm';
import { can, requireViewer } from '@/server/auth/viewer';
import { db } from '@/server/db';
import { meetings, notifications, taskRequests } from '@/server/db/schema';
import { getSetting } from '@/server/settings';
import { buildNav } from '@/components/portal/shell/nav';
import { Sidebar } from '@/components/portal/shell/Sidebar';
import { Topbar } from '@/components/portal/shell/Topbar';
import { PwaClient } from '@/components/portal/shell/PwaClient';
import { ROLE_LABELS } from '@/lib/portal/permissions';

/**
 * Authenticated application shell. `requireViewer()` validates the session
 * against the database on every request (the middleware cookie check is
 * only a fast path) and redirects to sign-in otherwise.
 */
export default async function PortalAppLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  const [[unread], notifSettings] = await Promise.all([
    db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, viewer.id), isNull(notifications.readAt))),
    getSetting('notifications'),
  ]);

  // Security policy: team accounts must enrol in 2FA before using the portal.
  const security = await getSetting('security');
  if (security.enforceMfaForInternal && viewer.isInternal && !viewer.totpEnabled) {
    const path = (await headers()).get('x-portal-path') ?? '';
    if (!path.startsWith('/portal/settings')) redirect('/portal/settings?section=security&mfa=required');
  }

  // Review queues show a count for the people who work them.
  const [[pendingRequests], [pendingMeetings]] = await Promise.all([
    can(viewer, 'task_requests.review') ? db.select({ n: count() }).from(taskRequests).where(eq(taskRequests.status, 'pending')) : Promise.resolve([{ n: 0 }]),
    can(viewer, 'meetings.manage') ? db.select({ n: count() }).from(meetings).where(eq(meetings.status, 'requested')) : Promise.resolve([{ n: 0 }]),
  ]);
  const groups = buildNav(viewer, { '/portal/notifications': unread?.n ?? 0, '/portal/requests': pendingRequests?.n || undefined, '/portal/meetings': pendingMeetings?.n || undefined });
  const workspace = viewer.isInternal ? 'Isha Technologies' : (viewer.clientName ?? 'Client');

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-white via-white to-brand/[0.04]">
      <Sidebar groups={groups} workspaceLabel={workspace} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          groups={groups}
          user={{ name: viewer.name, email: viewer.email, roleLabel: ROLE_LABELS[viewer.role], workspace, avatarUrl: viewer.avatarUrl }}
          pollSeconds={Math.max(10, notifSettings.pollSeconds)}
          soundAllowed={notifSettings.soundEnabled}
          unread={unread?.n ?? 0}
        />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <PwaClient />
    </div>
  );
}
