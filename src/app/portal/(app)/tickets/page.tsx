import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { LifeBuoy } from 'lucide-react';
import { db } from '@/server/db';
import { clients, projects, tickets, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { clientScope, memberProjectIds, projectScope, ticketScope } from '@/server/scope';
import { internalPeople } from '@/server/queries/people';
import { Avatar, EmptyState, PageHeader, Pagination, Panel, StatCard, StatusBadge, Table, Td, Th, Tr } from '@/components/portal/ui';
import { NewTicketButton } from '@/components/portal/tickets/TicketForms';
import { humanize, relativeTime } from '@/lib/portal/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Support tickets' };

const PAGE = 25;
const VIEWS = { open: ['open', 'in_progress', 'waiting_for_client'], resolved: ['resolved', 'closed'], all: ['open', 'in_progress', 'waiting_for_client', 'resolved', 'closed'] } as const;

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ view?: string; new?: string; client?: string; mine?: string; page?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const view = (Object.keys(VIEWS) as (keyof typeof VIEWS)[]).find((k) => k === sp.view) ?? 'open';
  const mine = viewer.isInternal && sp.mine === '1';

  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const listWhere = and(ticketScope(viewer), inArray(tickets.status, [...VIEWS[view]]), mine ? eq(tickets.assigneeId, viewer.id) : undefined);
  const canCreate = !viewer.isInternal || can(viewer, 'tickets.manage') || viewer.role === 'employee';
  // One parallel batch: the page of tickets, its total, the summary-card counts (aggregated in SQL instead of
  // pulling every open ticket) and the "new ticket" pickers — previously three sequential stages.
  const [rows, [{ total }], [openStats], clientOptions, projectOptions, people] = await Promise.all([
    db
      .select({ t: tickets, clientName: clients.companyName, projectName: projects.name, assignee: users.name })
      .from(tickets)
      .innerJoin(clients, eq(clients.id, tickets.clientId))
      .leftJoin(projects, eq(projects.id, tickets.projectId))
      .leftJoin(users, eq(users.id, tickets.assigneeId))
      .where(listWhere)
      .orderBy(desc(tickets.lastActivityAt), desc(tickets.id))
      .limit(PAGE)
      .offset((page - 1) * PAGE),
    db.select({ total: count() }).from(tickets).where(listWhere),
    db
      .select({
        open: sql<number>`(count(*) filter (where ${tickets.status} = 'open'))::int`,
        inProgress: sql<number>`(count(*) filter (where ${tickets.status} = 'in_progress'))::int`,
        waiting: sql<number>`(count(*) filter (where ${tickets.status} = 'waiting_for_client'))::int`,
        urgent: sql<number>`(count(*) filter (where ${tickets.priority} in ('urgent','high')))::int`,
      })
      .from(tickets)
      .where(and(ticketScope(viewer), inArray(tickets.status, [...VIEWS.open]))),
    viewer.isInternal ? db.select({ id: clients.id, name: clients.companyName }).from(clients).where(and(clientScope(viewer), ne(clients.status, 'inactive'))).orderBy(asc(clients.companyName)) : Promise.resolve([]),
    db
      .select({ id: projects.id, name: projects.name, clientId: projects.clientId })
      .from(projects)
      .where(and(projectScope(viewer), ne(projects.status, 'cancelled'), viewer.isInternal && !can(viewer, 'tickets.manage') ? inArray(projects.id, memberProjectIds(viewer)) : undefined)),
    viewer.isInternal ? internalPeople(viewer) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title={viewer.isInternal ? 'Support tickets' : 'Support'}
        description={viewer.isInternal ? 'Client issues, requests and questions — with complete history.' : 'Raise an issue or request and follow every update.'}
        actions={canCreate ? <NewTicketButton isInternal={viewer.isInternal} clients={clientOptions} projects={projectOptions} people={people} defaultClientId={sp.client} autoOpen={sp.new === '1'} /> : null}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Open" value={openStats?.open ?? 0} icon={LifeBuoy} tone="sky" />
        <StatCard label="In progress" value={openStats?.inProgress ?? 0} icon={LifeBuoy} />
        <StatCard label="Waiting for client" value={openStats?.waiting ?? 0} icon={LifeBuoy} tone="amber" />
        <StatCard label="Urgent / high" value={openStats?.urgent ?? 0} icon={LifeBuoy} tone="red" />
      </div>
      <div className="mb-4 flex flex-wrap gap-1">
        {(['open', 'resolved', 'all'] as const).map((k) => (
          <Link key={k} href={`/portal/tickets?view=${k}${mine ? '&mine=1' : ''}`} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', view === k ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-50')}>
            {humanize(k)}
          </Link>
        ))}
        {viewer.isInternal && (
          <Link href={`/portal/tickets?view=${view}${mine ? '' : '&mine=1'}`} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', mine ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-50')}>
            Assigned to me
          </Link>
        )}
      </div>
      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="No tickets" description={view === 'open' ? 'No open tickets right now.' : undefined} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Ticket</Th>
                {viewer.isInternal && <Th>Client</Th>}
                <Th>Priority</Th>
                <Th>Assignee</Th>
                <Th>Updated</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ t, clientName, projectName, assignee }) => (
                <Tr key={t.id}>
                  <Td>
                    <Link href={`/portal/tickets/${t.id}`} className="font-medium text-slate-900 hover:text-brand">
                      {t.subject}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      {t.number} · {humanize(t.category)}
                      {projectName ? ` · ${projectName}` : ''}
                    </span>
                  </Td>
                  {viewer.isInternal && <Td>{clientName}</Td>}
                  <Td>
                    <StatusBadge status={t.priority} />
                  </Td>
                  <Td>
                    {assignee ? (
                      <span className="flex items-center gap-2">
                        <Avatar name={assignee} size="xs" />
                        {assignee}
                      </span>
                    ) : (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </Td>
                  <Td className="text-xs text-slate-500">{relativeTime(t.lastActivityAt)}</Td>
                  <Td>
                    <StatusBadge status={t.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE} total={total} hrefFor={(p) => `/portal/tickets?${new URLSearchParams({ view, ...(mine ? { mine: '1' } : {}), page: String(p) })}`} />
      </Panel>
    </>
  );
}
