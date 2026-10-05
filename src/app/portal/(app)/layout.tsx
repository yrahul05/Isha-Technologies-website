import { Suspense, type ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq, sql } from 'drizzle-orm';
import { can, requireViewer } from '@/server/auth/viewer';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { getSettings } from '@/server/settings';
import { buildNav } from '@/components/portal/shell/nav';
import { Sidebar } from '@/components/portal/shell/Sidebar';
import { Topbar } from '@/components/portal/shell/Topbar';
import { PwaClient } from '@/components/portal/shell/PwaClient';
import { NavProgress } from '@/components/portal/shell/NavProgress';
import { ROLE_LABELS } from '@/lib/portal/permissions';

/**
 * Authenticated application shell. `requireViewer()` validates the session
 * against the database on every request (the middleware cookie check is
 * only a fast path) and redirects to sign-in otherwise.
 */
export default async function PortalAppLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  // Everything the shell needs in ONE parallel batch (settings + the three badge counts are two
  // round-trips total, pipelined) — it used to be four sequential stages on every navigation.
  const reviewTasks = can(viewer, 'task_requests.review');
  const manageMeetings = can(viewer, 'meetings.manage');
  const [settingsBundle, [counts]] = await Promise.all([
    getSettings(['notifications', 'security']),
    db.select({
      unread: sql<number>`(select count(*)::int from notifications n where n.user_id = ${viewer.id} and n.read_at is null)`,
      requests: reviewTasks ? sql<number>`(select count(*)::int from task_requests where status = 'pending')` : sql<number>`0`,
      meetings: manageMeetings ? sql<number>`(select count(*)::int from meetings where status = 'requested')` : sql<number>`0`,
    }).from(users).where(eq(users.id, viewer.id)).limit(1),
  ]);
  const { notifications: notifSettings, security } = settingsBundle;

  // Security policy: team accounts must enrol in 2FA before using the portal.
  if (security.enforceMfaForInternal && viewer.isInternal && !viewer.totpEnabled) {
    const path = (await headers()).get('x-portal-path') ?? '';
    if (!path.startsWith('/portal/settings')) redirect('/portal/settings?section=security&mfa=required');
  }

  const unread = { n: counts?.unread ?? 0 };
  const groups = buildNav(viewer, { '/portal/notifications': unread.n, '/portal/requests': counts?.requests || undefined, '/portal/meetings': counts?.meetings || undefined });
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
          unread={unread.n}
        />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <PwaClient />
    </div>
  );
}
