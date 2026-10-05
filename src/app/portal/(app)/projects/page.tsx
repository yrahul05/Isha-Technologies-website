import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, count, eq, inArray, isNotNull, isNull, ne } from 'drizzle-orm';
import { CalendarRange, FolderKanban } from 'lucide-react';
import { db } from '@/server/db';
import { clients, projects } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { projectScope } from '@/server/scope';
import { projectProgress, projectTeams } from '@/server/queries/common';
import { clientPeople, internalPeople } from '@/server/queries/people';
import { AvatarStack, EmptyState, PageHeader, Pagination, ProgressBar, StatusBadge } from '@/components/portal/ui';
import { NewProjectButton } from '@/components/portal/projects/ProjectForm';
import { daysUntil, fmtDate } from '@/lib/portal/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Projects' };

const FILTERS = [
  { key: 'live', label: 'Live', statuses: ['planning', 'active', 'on_hold', 'at_risk'] },
  { key: 'at_risk', label: 'At risk', statuses: ['at_risk'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'all', label: 'All', statuses: ['planning', 'active', 'on_hold', 'at_risk', 'completed', 'cancelled'] },
  { key: 'archived', label: 'Archived', statuses: ['completed', 'cancelled'] },
] as const;

const PAGE = 24;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ filter?: string; client?: string; new?: string; page?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.filter) ?? FILTERS[0];

  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const where = and(projectScope(viewer), inArray(projects.status, [...filter.statuses]), filter.key === 'archived' ? isNotNull(projects.archivedAt) : isNull(projects.archivedAt));
  const manage = can(viewer, 'projects.manage');

  // The page of projects (+ its progress/team lookups, which only need that page's ids) runs alongside the
  // total and the "new project" pickers instead of after them.
  const loadPage = async () => {
    const pageRows = await db
      .select({ p: projects, clientName: clients.companyName })
      .from(projects)
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(where)
      .orderBy(asc(projects.dueDate), asc(projects.id))
      .limit(PAGE)
      .offset((page - 1) * PAGE);
    const ids = pageRows.map((r) => r.p.id);
    const [progress, teams] = await Promise.all([projectProgress(ids), projectTeams(ids)]);
    return { rows: pageRows, progress, teams };
  };
  const [{ rows, progress, teams }, [{ total }], [clientOptions, team, people]] = await Promise.all([
    loadPage(),
    db.select({ total: count() }).from(projects).where(where),
    manage
      ? Promise.all([
          db.select({ id: clients.id, name: clients.companyName }).from(clients).where(ne(clients.status, 'inactive')).orderBy(asc(clients.companyName)),
          internalPeople(viewer),
          clientPeople(viewer),
        ])
      : Promise.resolve([[], [], []] as [{ id: string; name: string }[], Awaited<ReturnType<typeof internalPeople>>, Awaited<ReturnType<typeof clientPeople>>]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Delivery"
        title="Projects"
        description={viewer.isInternal ? 'Delivery status across every engagement you can access.' : 'Everything Isha Technologies is delivering for you.'}
        actions={manage ? <NewProjectButton clients={clientOptions} team={team} clientPeople={people} defaultClientId={sp.client} autoOpen={sp.new === '1'} /> : null}
      />
      <div className="mb-5 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/portal/projects?filter=${f.key}`} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', f.key === filter.key ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-50')}>
            {f.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white">
          <EmptyState icon={FolderKanban} title="No projects here" description="Projects you’re assigned to appear here." />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map(({ p, clientName }) => {
            const pr = progress.get(p.id)!;
            const members = teams.get(p.id) ?? [];
            const d = daysUntil(p.dueDate);
            return (
              <Link key={p.id} href={`/portal/projects/${p.id}`} className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5">
                <span
                  className={cn(
                    'absolute inset-x-0 top-0 h-1',
                    p.health === 'off_track' ? 'bg-rose-500' : p.health === 'at_risk' ? 'bg-amber-400' : 'bg-gradient-to-r from-brand to-brand/40'
                  )}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {p.code} · {clientName}
                    </p>
                    <h2 className="card-accent mt-1 truncate text-base font-semibold tracking-tight text-slate-900">{p.name}</h2>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">{p.description || 'No description yet.'}</p>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-slate-500">
                      {pr.done} of {pr.total} tasks
                    </span>
                    <span className="font-semibold tabular-nums text-slate-800">{pr.pct}%</span>
                  </div>
                  <ProgressBar value={pr.pct} tone={p.health === 'off_track' ? 'red' : p.health === 'at_risk' ? 'amber' : 'brand'} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                  <AvatarStack names={members.filter((m) => m.type === 'team').map((m) => m.name)} />
                  <span className={cn('inline-flex items-center gap-1.5 text-xs', d !== null && d < 0 && p.status !== 'completed' ? 'font-semibold text-rose-600' : 'text-slate-500')}>
                    <CalendarRange className="h-3.5 w-3.5" />
                    {p.status === 'completed' ? `Completed ${fmtDate(p.completedAt, 'short')}` : p.dueDate ? (d !== null && d < 0 ? `${-d} days overdue` : `Due ${fmtDate(p.dueDate, 'short')}`) : 'No due date'}
                  </span>
                </div>
                {p.technologies.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.technologies.slice(0, 5).map((t) => (
                      <span key={t} className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
      <Pagination page={page} pageSize={PAGE} total={total} hrefFor={(p) => `/portal/projects?${new URLSearchParams({ filter: filter.key, page: String(p) })}`} />
    </>
  );
}
