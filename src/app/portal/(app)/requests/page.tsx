import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { Inbox } from 'lucide-react';
import { db } from '@/server/db';
import { clients, projects, taskRequests, tasks, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { projectScope, taskRequestScope } from '@/server/scope';
import { Badge, EmptyState, PageHeader, Panel, Table, Tabs, Td, Th, Tr } from '@/components/portal/ui';
import { NewRequestButton } from '@/components/portal/requests/RequestForms';
import { requestStage, STAGE_LABELS, STAGE_TONES } from '@/lib/portal/task-requests';
import { fmtDate } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Work requests' };

const FILTERS = [
  { key: 'open', label: 'Open', statuses: ['pending', 'approved'] as const },
  { key: 'pending', label: 'Awaiting approval', statuses: ['pending'] as const },
  { key: 'closed', label: 'Declined & withdrawn', statuses: ['rejected', 'cancelled'] as const },
  { key: 'all', label: 'All', statuses: ['pending', 'approved', 'rejected', 'cancelled'] as const },
];

/**
 * Client work requests. Clients see only their own account's requests;
 * reviewers (task_requests.review) and task managers see every client's.
 * Scoping is enforced by taskRequestScope in the query, not by the UI.
 */
export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const viewer = await requireViewer();
  if (viewer.isInternal && !can(viewer, 'task_requests.review') && !can(viewer, 'tasks.manage')) notFound();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.filter) ?? FILTERS[0];

  const [rows, clientProjects] = await Promise.all([
    db
    .select({ r: taskRequests, clientName: clients.companyName, projectName: projects.name, requester: users.name, task: { status: tasks.status, assigneeId: tasks.assigneeId, deletedAt: tasks.deletedAt } })
    .from(taskRequests)
    .innerJoin(clients, eq(clients.id, taskRequests.clientId))
    .leftJoin(projects, eq(projects.id, taskRequests.projectId))
    .leftJoin(users, eq(users.id, taskRequests.requestedBy))
    .leftJoin(tasks, eq(tasks.id, taskRequests.taskId))
    .where(and(taskRequestScope(viewer), inArray(taskRequests.status, [...filter.statuses])))
    .orderBy(desc(taskRequests.createdAt))
    .limit(300),
    !viewer.isInternal && viewer.clientId
      ? db.select({ id: projects.id, name: projects.name }).from(projects).where(and(projectScope(viewer), eq(projects.clientId, viewer.clientId), isNull(projects.archivedAt))).orderBy(asc(projects.name))
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={viewer.isInternal ? 'Delivery' : 'Your work'}
        title={viewer.isInternal ? 'Client requests' : 'Work requests'}
        description={
          viewer.isInternal
            ? 'Work requested by clients. Approve to turn a request into a task on the client’s project, then assign it.'
            : 'Ask for new work. Requests are reviewed by Isha Technologies, then scheduled and assigned to the right engineer.'
        }
        actions={!viewer.isInternal ? <NewRequestButton projects={clientProjects} /> : null}
      />
      <Tabs active={filter.key} tabs={FILTERS.map((f) => ({ key: f.key, label: f.label, href: `/portal/requests?filter=${f.key}` }))} />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={Inbox} title="No requests here" description={viewer.isInternal ? 'New client requests will appear here and in your notifications.' : 'Use “New request” to ask for work.'} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Request</Th>
                {viewer.isInternal && <Th>Client</Th>}
                <Th>Project</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, clientName, projectName, requester, task }) => {
                const stage = requestStage(r, task?.status ? task : null);
                return (
                  <Tr key={r.id}>
                    <Td>
                      <Link href={`/portal/requests/${r.id}`} className="font-medium text-slate-900 hover:text-brand">
                        {r.title}
                      </Link>
                      <span className="block text-xs capitalize text-slate-500">{r.priority} priority</span>
                    </Td>
                    {viewer.isInternal && <Td>{clientName}</Td>}
                    <Td>{projectName ?? <span className="text-slate-400">Not specified</span>}</Td>
                    <Td>
                      <span className="block">{fmtDate(r.createdAt)}</span>
                      <span className="block text-xs text-slate-500">{requester ?? '—'}</span>
                    </Td>
                    <Td>
                      <Badge tone={STAGE_TONES[stage]}>{STAGE_LABELS[stage]}</Badge>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
