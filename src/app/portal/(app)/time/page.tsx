import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq, gte, lte, ne } from 'drizzle-orm';
import { ChevronLeft, ChevronRight, Clock, Gauge, Receipt } from 'lucide-react';
import { db } from '@/server/db';
import { employees, projects, tasks, timeEntries, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { projectScope, taskScope, timeEntryScope } from '@/server/scope';
import { EmptyState, PageHeader, Panel, StatCard, Table, Td, Th, Tr, Badge } from '@/components/portal/ui';
import { DeleteEntryButton, TimeEntryForm } from '@/components/portal/time/TimeForms';
import { addDays, formatDuration, weekStart } from '@/lib/portal/time';
import { fmtDate, todayIST } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Time tracking' };

export default async function TimePage({ searchParams }: { searchParams: Promise<{ week?: string; scope?: string }> }) {
  const viewer = await requireViewer();
  if (!viewer.isInternal || !(can(viewer, 'time.log') || can(viewer, 'time.view_all'))) notFound();
  const sp = await searchParams;
  const today = todayIST();
  const start = weekStart(/^\d{4}-\d{2}-\d{2}$/.test(sp.week ?? '') ? sp.week! : today);
  const end = addDays(start, 6);
  const team = sp.scope === 'team' && can(viewer, 'time.view_all');

  const logging = can(viewer, 'time.log');
  // The week's entries and the logging pickers are independent: one parallel batch.
  const [rows, [projectRows, taskRows, [self]]] = await Promise.all([
    db
      .select({ e: timeEntries, project: projects.name, task: tasks.title, person: users.name })
      .from(timeEntries)
      .innerJoin(projects, eq(projects.id, timeEntries.projectId))
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .where(and(timeEntryScope(viewer), gte(timeEntries.workDate, start), lte(timeEntries.workDate, end), team ? undefined : eq(timeEntries.userId, viewer.id)))
      .orderBy(desc(timeEntries.workDate), desc(timeEntries.createdAt)),
    logging
    ? Promise.all([
        db.select({ id: projects.id, name: projects.name }).from(projects).where(and(projectScope(viewer), ne(projects.status, 'cancelled'), ne(projects.status, 'completed'))).orderBy(asc(projects.name)),
        db.select({ id: tasks.id, title: tasks.title, projectId: tasks.projectId }).from(tasks).where(and(taskScope(viewer), ne(tasks.status, 'completed'))).orderBy(asc(tasks.title)).limit(400),
        db.select({ cap: employees.weeklyCapacityHours }).from(employees).where(eq(employees.userId, viewer.id)),
      ])
    : Promise.resolve([[], [], []] as [{ id: string; name: string }[], { id: string; title: string; projectId: string }[], { cap: number }[]]),
  ]);

  const total = rows.reduce((s, r) => s + r.e.minutes, 0);
  const billable = rows.reduce((s, r) => s + (r.e.billable ? r.e.minutes : 0), 0);
  const capacity = (self?.cap ?? 40) * 60;
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const byDay = new Map(days.map((d) => [d, rows.filter((r) => r.e.workDate === d)]));
  const href = (week: string, scope = team ? 'team' : 'me') => `/portal/time?week=${week}${scope === 'team' ? '&scope=team' : ''}`;

  return (
    <>
      <PageHeader
        eyebrow="Delivery"
        title="Time tracking"
        description={team ? 'Everyone’s logged time for the week.' : 'Log what you worked on. Billable hours feed project profitability.'}
        actions={
          can(viewer, 'time.view_all') ? (
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm font-medium">
              <Link href={href(start, 'me')} className={!team ? 'rounded-md bg-brand/10 px-3 py-1.5 text-brand' : 'px-3 py-1.5 text-slate-600'}>My time</Link>
              <Link href={href(start, 'team')} className={team ? 'rounded-md bg-brand/10 px-3 py-1.5 text-brand' : 'px-3 py-1.5 text-slate-600'}>Team</Link>
            </div>
          ) : null
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Logged this week" value={formatDuration(total)} icon={Clock} />
        <StatCard label="Billable" value={formatDuration(billable)} icon={Receipt} tone="green" hint={total ? `${Math.round((billable / total) * 100)}% of logged time` : undefined} />
        {!team && <StatCard label="Of weekly capacity" value={`${Math.min(999, Math.round((total / capacity) * 100))}%`} icon={Gauge} tone={total > capacity ? 'amber' : 'violet'} hint={`${formatDuration(capacity)} capacity`} />}
        <div className="col-span-2 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 xl:col-span-1">
          <Link aria-label="Previous week" href={href(addDays(start, -7))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></Link>
          <span className="text-sm font-semibold text-slate-900">{fmtDate(start, 'short')} – {fmtDate(end, 'short')}</span>
          <Link aria-label="Next week" href={href(addDays(start, 7))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></Link>
        </div>
      </div>

      {logging && !team && (
        <Panel className="mb-6" title="Log time">
          <TimeEntryForm projects={projectRows} tasks={taskRows} today={today} />
        </Panel>
      )}

      {rows.length === 0 ? (
        <Panel><EmptyState icon={Clock} title="Nothing logged this week" description="Entries you add appear here, grouped by day." /></Panel>
      ) : (
        days.map((d) => {
          const list = byDay.get(d) ?? [];
          if (list.length === 0) return null;
          return (
            <Panel key={d} className="mb-4" title={fmtDate(d, 'long')} action={<Badge tone="brand">{formatDuration(list.reduce((s, r) => s + r.e.minutes, 0))}</Badge>} bodyClassName="pb-2">
              <Table>
                <thead><tr>{team && <Th>Person</Th>}<Th>Project</Th><Th>Task / note</Th><Th className="text-right">Time</Th><Th /></tr></thead>
                <tbody>
                  {list.map(({ e, project, task, person }) => (
                    <Tr key={e.id}>
                      {team && <Td>{person}</Td>}
                      <Td className="font-medium text-slate-900">{project}</Td>
                      <Td>{[task, e.note].filter(Boolean).join(' — ') || '—'} {!e.billable && <Badge tone="slate">Non-billable</Badge>}</Td>
                      <Td className="text-right font-semibold tabular-nums">{formatDuration(e.minutes)}</Td>
                      <Td className="w-10">{(e.userId === viewer.id || can(viewer, 'time.view_all')) && <DeleteEntryButton id={e.id} />}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          );
        })
      )}
    </>
  );
}
