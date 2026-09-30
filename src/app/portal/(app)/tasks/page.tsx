import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { ClipboardCheck, Columns3, List } from 'lucide-react';
import { db } from '@/server/db';
import { projects, tasks } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { isUuid, memberProjectIds, projectScope } from '@/server/scope';
import { boardTasks } from '@/server/queries/tasks';
import { internalPeople } from '@/server/queries/people';
import { EmptyState, PageHeader, Panel, StatusBadge, Table, Td, Th, Tr, Avatar, Badge } from '@/components/portal/ui';
import { KanbanBoard } from '@/components/portal/tasks/KanbanBoard';
import { NewTaskButton } from '@/components/portal/tasks/TaskForm';
import { daysUntil, fmtDate } from '@/lib/portal/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Tasks' };

type Search = { view?: string; mine?: string; project?: string; status?: string; new?: string };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Search> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const view = sp.view === 'list' ? 'list' : 'board';
  const mine = viewer.isInternal && sp.mine === '1';
  const projectId = isUuid(sp.project) ? sp.project : undefined;
  const statuses = ['todo', 'in_progress', 'review', 'completed', 'blocked'] as const;
  const status = statuses.find((s) => s === sp.status);

  const items = await boardTasks(
    viewer,
    and(mine ? eq(tasks.assigneeId, viewer.id) : undefined, projectId ? eq(tasks.projectId, projectId) : undefined, status ? eq(tasks.status, status) : undefined)
  );

  const projectOptions = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(projectScope(viewer), ne(projects.status, 'cancelled')))
    .orderBy(asc(projects.name));

  // Projects the viewer may create tasks in.
  const creatable = !viewer.isInternal
    ? []
    : can(viewer, 'tasks.manage')
      ? projectOptions
      : await db.select({ id: projects.id, name: projects.name }).from(projects).where(inArray(projects.id, memberProjectIds(viewer)));
  const people = viewer.isInternal ? await internalPeople(viewer) : [];

  const qs = (patch: Partial<Search>) => {
    const next = { ...sp, ...patch, new: undefined };
    const p = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `/portal/tasks${p.size ? `?${p}` : ''}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Delivery"
        title={viewer.isInternal ? 'Tasks' : 'Action items'}
        description={viewer.isInternal ? 'Plan, assign and track delivery work.' : 'Work items your Isha Technologies team has shared with you.'}
        actions={creatable.length ? <NewTaskButton projects={creatable} people={people} defaultProjectId={projectId} autoOpen={sp.new === '1'} /> : null}
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {viewer.isInternal && (
            <>
              <FilterLink href={qs({ mine: undefined })} active={!mine}>
                All visible
              </FilterLink>
              <FilterLink href={qs({ mine: '1' })} active={mine}>
                Assigned to me
              </FilterLink>
              <span className="mx-1 h-5 w-px bg-gray-200" />
            </>
          )}
          <form className="flex items-center gap-2">
            {Object.entries(sp)
              .filter(([k, v]) => v && k !== 'project' && k !== 'new')
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <select name="project" defaultValue={projectId ?? ''} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-brand focus:outline-none">
              <option value="">All projects</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand">Apply</button>
          </form>
        </div>
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          <Link href={qs({ view: undefined })} className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold', view === 'board' ? 'bg-brand text-white' : 'text-slate-500 hover:text-slate-900')}>
            <Columns3 className="h-3.5 w-3.5" /> Board
          </Link>
          <Link href={qs({ view: 'list' })} className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold', view === 'list' ? 'bg-brand text-white' : 'text-slate-500 hover:text-slate-900')}>
            <List className="h-3.5 w-3.5" /> List
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <Panel>
          <EmptyState icon={ClipboardCheck} title="No tasks match" description={viewer.isInternal ? 'Create a task or change the filters.' : 'Nothing has been shared with you yet.'} />
        </Panel>
      ) : view === 'board' ? (
        <KanbanBoard tasks={items} showProject={!projectId} />
      ) : (
        <Panel>
          <Table>
            <thead>
              <tr>
                <Th>Task</Th>
                <Th>Assignee</Th>
                <Th>Priority</Th>
                <Th>Due</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const d = daysUntil(t.dueDate);
                return (
                  <Tr key={t.id}>
                    <Td>
                      <Link href={`/portal/tasks/${t.id}`} className="font-medium text-slate-900 hover:text-brand">
                        {t.title}
                      </Link>
                      <span className="block text-xs text-slate-500">
                        {t.project}
                        {t.visibility === 'client' && viewer.isInternal ? ' · shared with client' : ''}
                      </span>
                    </Td>
                    <Td>
                      {t.assignee ? (
                        <span className="flex items-center gap-2">
                          <Avatar name={t.assignee} size="xs" /> {t.assignee}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={t.priority} />
                    </Td>
                    <Td className={cn('tabular-nums', d !== null && d < 0 && t.status !== 'completed' && 'font-semibold text-rose-600')}>
                      {fmtDate(t.dueDate, 'short')}
                      {d !== null && d < 0 && t.status !== 'completed' && <Badge tone="red" className="ml-2">Overdue</Badge>}
                    </Td>
                    <Td>
                      <StatusBadge status={t.status} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Panel>
      )}
    </>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', active ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-50')}>
      {children}
    </Link>
  );
}
