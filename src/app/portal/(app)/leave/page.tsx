import type { Metadata } from 'next';
import { desc, eq } from 'drizzle-orm';
import { Palmtree } from 'lucide-react';
import { db } from '@/server/db';
import { leaveRequests, users } from '@/server/db/schema';
import { can, requireInternal } from '@/server/auth/viewer';
import { leaveScope } from '@/server/scope';
import { Avatar, EmptyState, PageHeader, Panel, StatusBadge, Table, Td, Th, Tr } from '@/components/portal/ui';
import { CancelLeaveButton, RequestLeaveButton, ReviewLeaveForm } from '@/components/portal/comms/CommsForms';
import { fmtDate, humanize, todayIST } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Leave' };

function days(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000) + 1;
}

export default async function LeavePage() {
  const viewer = await requireInternal();
  const reviewer = can(viewer, 'leave.review');
  const rows = await db
    .select({ l: leaveRequests, name: users.name })
    .from(leaveRequests)
    .innerJoin(users, eq(users.id, leaveRequests.userId))
    .where(leaveScope(viewer))
    .orderBy(desc(leaveRequests.startDate))
    .limit(200);
  const today = todayIST();
  const pending = rows.filter((r) => r.l.status === 'pending');
  const onLeaveToday = rows.filter((r) => r.l.status === 'approved' && r.l.startDate <= today && r.l.endDate >= today);

  return (
    <>
      <PageHeader eyebrow="Team" title="Leave" description={reviewer ? 'Requests, approvals and who is away.' : 'Your leave requests and their status.'} actions={<RequestLeaveButton />} />
      {reviewer && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Awaiting approval" description={`${pending.length} pending`}>
            {pending.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing to review.</p>
            ) : (
              <ul className="space-y-3">
                {pending.map(({ l, name }) => (
                  <li key={l.id} className="rounded-xl border border-gray-100 p-3">
                    <div className="mb-2 flex items-center gap-3">
                      <Avatar name={name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{name}</p>
                        <p className="text-xs text-slate-500">
                          {humanize(l.type)} · {fmtDate(l.startDate, 'short')} → {fmtDate(l.endDate, 'short')} · {days(l.startDate, l.endDate)} day(s)
                        </p>
                        {l.reason && <p className="mt-1 text-xs text-slate-600">“{l.reason}”</p>}
                      </div>
                    </div>
                    {l.userId !== viewer.id || viewer.isSuperAdmin ? <ReviewLeaveForm id={l.id} /> : <p className="text-xs text-slate-500">Another reviewer must approve your own leave.</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Away today">
            {onLeaveToday.length === 0 ? (
              <p className="text-sm text-slate-500">Everyone is in today.</p>
            ) : (
              <ul className="space-y-2">
                {onLeaveToday.map(({ l, name }) => (
                  <li key={l.id} className="flex items-center gap-3">
                    <Avatar name={name} size="sm" />
                    <span className="text-sm text-slate-800">{name}</span>
                    <span className="ml-auto text-xs text-slate-500">back {fmtDate(l.endDate, 'short')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
      <Panel title={reviewer ? 'All leave' : 'My leave'}>
        {rows.length === 0 ? (
          <EmptyState icon={Palmtree} title="No leave records" />
        ) : (
          <Table>
            <thead>
              <tr>
                {reviewer && <Th>Person</Th>}
                <Th>Type</Th>
                <Th>Dates</Th>
                <Th className="text-right">Days</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ l, name }) => (
                <Tr key={l.id}>
                  {reviewer && <Td className="font-medium text-slate-900">{name}</Td>}
                  <Td>{humanize(l.type)}</Td>
                  <Td>
                    {fmtDate(l.startDate)} → {fmtDate(l.endDate)}
                    {l.reviewNote && <span className="block text-xs text-slate-500">{l.reviewNote}</span>}
                  </Td>
                  <Td className="text-right tabular-nums">{days(l.startDate, l.endDate)}</Td>
                  <Td>
                    <StatusBadge status={l.status} />
                  </Td>
                  <Td>{l.userId === viewer.id && l.status === 'pending' && <CancelLeaveButton id={l.id} />}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
