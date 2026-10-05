import type { Metadata } from 'next';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { AlertTriangle, CalendarDays, Megaphone, PartyPopper, Plane, Wrench } from 'lucide-react';
import { db } from '@/server/db';
import { announcements, clients, notifications, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { isUuid } from '@/server/scope';
import { Badge, EmptyState, IconChip, PageHeader, Panel, StatusBadge } from '@/components/portal/ui';
import { AnnouncementComposer } from '@/components/portal/comms/CommsForms';
import { ROLE_LABELS } from '@/lib/portal/permissions';
import { fmtDate, fmtDateTime, humanize } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Announcements' };

const KIND_ICON = { general: Megaphone, office: Megaphone, holiday: PartyPopper, leave: Plane, maintenance: Wrench, emergency: AlertTriangle } as const;

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const canSend = can(viewer, 'notifications.send');

  // Announcements this viewer actually received — never anyone else's.
  const receivedQuery = db
    .selectDistinctOn([announcements.id], { a: announcements })
    .from(notifications)
    .innerJoin(announcements, eq(announcements.id, notifications.announcementId))
    .where(eq(notifications.userId, viewer.id))
    .orderBy(announcements.id);
  // Own inbox and (for senders) the sent list / pickers load in one parallel batch.
  const [received, [sent, people, clientOptions]] = await Promise.all([receivedQuery, loadSenderData()]);
  received.sort((x, y) => y.a.createdAt.getTime() - x.a.createdAt.getTime());

  function loadSenderData() {
    return canSend
    ? Promise.all([
        db
          .select({ a: announcements, by: users.name, recipients: sql<number>`(select count(*)::int from notifications n where n.announcement_id = ${announcements.id})`, reads: sql<number>`(select count(*)::int from notifications n where n.announcement_id = ${announcements.id} and n.read_at is not null)` })
          .from(announcements)
          .leftJoin(users, eq(users.id, announcements.createdBy))
          .orderBy(desc(announcements.createdAt))
          .limit(30),
        db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(and(eq(users.isActive, true), inArray(users.role, ['admin', 'employee', 'super_admin']))).orderBy(asc(users.name)),
        db.select({ id: clients.id, name: clients.companyName }).from(clients).orderBy(asc(clients.companyName)),
      ])
    : Promise.resolve([[], [], []] as [never[], never[], never[]]);
  }

  return (
    <>
      <PageHeader eyebrow="Communication" title="Announcements" description={canSend ? 'Send targeted notices — to employees only, specific people, or specific clients.' : 'Notices from Isha Technologies.'} />
      <div className="grid gap-6 xl:grid-cols-5">
        {canSend && (
          <div className="space-y-6 xl:col-span-3">
            <Panel title="New announcement or notification" description="Delivered in-portal instantly; high/urgent also plays a sound and emails.">
              <AnnouncementComposer people={people.map((p) => ({ id: p.id, name: p.name, meta: ROLE_LABELS[p.role] }))} clients={clientOptions} defaultClientId={isUuid(sp.client) ? sp.client : undefined} />
            </Panel>
            <Panel title="Sent">
              {sent.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing sent yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {sent.map(({ a, by, recipients, reads }) => (
                    <li key={a.id} className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{a.title}</span>
                        <Badge tone="slate">{humanize(a.kind)}</Badge>
                        {a.priority !== 'normal' && <StatusBadge status={a.priority} />}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        To {a.audienceLabel} · {recipients} recipients · {reads} read · {by ?? '—'} · {fmtDateTime(a.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}
        <div className={canSend ? 'xl:col-span-2' : 'xl:col-span-5'}>
          <Panel title="Received">
            {received.length === 0 ? (
              <EmptyState icon={Megaphone} title="No announcements" />
            ) : (
              <ul className="space-y-3">
                {received.map(({ a }) => (
                  <li key={a.id} id={a.id} className="flex gap-3 rounded-xl border border-gray-100 p-3 target:border-brand/40 target:bg-brand/[0.03]">
                    <IconChip icon={KIND_ICON[a.kind]} tone={a.kind === 'emergency' ? 'red' : a.kind === 'holiday' ? 'violet' : 'brand'} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        {a.effectiveDate && (
                          <>
                            <CalendarDays className="h-3 w-3" /> {fmtDate(a.effectiveDate)} ·{' '}
                          </>
                        )}
                        {fmtDateTime(a.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
