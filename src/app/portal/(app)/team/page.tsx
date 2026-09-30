import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { UsersRound } from 'lucide-react';
import { db } from '@/server/db';
import { employees, leaveRequests, users } from '@/server/db/schema';
import { can, requirePermission } from '@/server/auth/viewer';
import { Avatar, Badge, EmptyState, PageHeader, Panel, ProgressBar, StatCard, StatusBadge, Table, Td, Th, Tr } from '@/components/portal/ui';
import { InviteTeamMemberButton } from '@/components/portal/team/TeamDialogs';
import { ROLE_LABELS } from '@/lib/portal/permissions';
import { relativeTime, todayIST } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Team' };

export default async function TeamPage() {
  const viewer = await requirePermission('team.view');
  const today = todayIST();

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      title: users.title,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      department: employees.department,
      capacity: employees.weeklyCapacityHours,
      availability: employees.availability,
      openTasks: sql<number>`(select count(*)::int from tasks t where t.assignee_id = ${users.id} and t.status <> 'completed')`,
      overdue: sql<number>`(select count(*)::int from tasks t where t.assignee_id = ${users.id} and t.status <> 'completed' and t.due_date < ${today})`,
      estimate: sql<number>`(select coalesce(sum(t.estimate_hours), 0)::float from tasks t where t.assignee_id = ${users.id} and t.status <> 'completed')`,
      projects: sql<number>`(select count(*)::int from project_members pm join projects p on p.id = pm.project_id where pm.user_id = ${users.id} and p.status not in ('completed','cancelled'))`,
      onLeave: sql<boolean>`exists (select 1 from ${leaveRequests} lr where lr.user_id = ${users.id} and lr.status = 'approved' and lr.start_date <= ${today} and lr.end_date >= ${today})`,
    })
    .from(users)
    .leftJoin(employees, eq(employees.userId, users.id))
    .where(and(ne(users.role, 'client')))
    .orderBy(asc(users.name));

  const active = rows.filter((r) => r.isActive);
  const onLeave = active.filter((r) => r.onLeave).length;
  const maxTasks = Math.max(5, ...active.map((r) => r.openTasks));

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Team & workload"
        description="Who is working on what, availability and leave — at a glance."
        actions={can(viewer, 'team.manage') ? <InviteTeamMemberButton canCreateAdmin={viewer.isSuperAdmin} /> : null}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active members" value={active.length} icon={UsersRound} />
        <StatCard label="On leave today" value={onLeave} icon={UsersRound} tone="violet" href="/portal/leave" />
        <StatCard label="Open tasks" value={active.reduce((s, r) => s + r.openTasks, 0)} icon={UsersRound} tone="sky" href="/portal/tasks" />
        <StatCard label="Overdue tasks" value={active.reduce((s, r) => s + r.overdue, 0)} icon={UsersRound} tone="red" />
      </div>
      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={UsersRound} title="No team members yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Role</Th>
                <Th>Workload</Th>
                <Th className="text-right">Projects</Th>
                <Th>Availability</Th>
                <Th>Last sign-in</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <Tr key={m.id} className={m.isActive ? '' : 'opacity-55'}>
                  <Td>
                    <Link href={`/portal/team/${m.id}`} className="group flex items-center gap-3">
                      <Avatar name={m.name} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 group-hover:text-brand">{m.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {m.title ?? m.email}
                          {m.department ? ` · ${m.department}` : ''}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={m.role === 'super_admin' ? 'violet' : m.role === 'admin' ? 'brand' : 'slate'}>{ROLE_LABELS[m.role]}</Badge>
                  </Td>
                  <Td className="w-56">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>
                        {m.openTasks} open{m.overdue ? <span className="font-semibold text-rose-600"> · {m.overdue} overdue</span> : null}
                      </span>
                      {m.estimate > 0 && <span>{m.estimate}h / {m.capacity ?? 40}h</span>}
                    </div>
                    <ProgressBar value={(m.openTasks / maxTasks) * 100} tone={m.overdue ? 'amber' : 'brand'} />
                  </Td>
                  <Td className="text-right tabular-nums">{m.projects}</Td>
                  <Td>{m.isActive ? <StatusBadge status={m.onLeave ? 'on_leave' : (m.availability ?? 'available')} /> : <Badge tone="red">Deactivated</Badge>}</Td>
                  <Td className="text-xs text-slate-500">{m.lastLoginAt ? relativeTime(m.lastLoginAt) : 'Never'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
