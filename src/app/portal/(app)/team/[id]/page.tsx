import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, ne } from 'drizzle-orm';
import { Mail, Phone } from 'lucide-react';
import { db } from '@/server/db';
import { auditLogs, employees, leaveRequests, projectMembers, projects, tasks, users } from '@/server/db/schema';
import { can, requirePermission } from '@/server/auth/viewer';
import { isUuid } from '@/server/scope';
import { Avatar, Badge, EmptyState, KeyValue, PageHeader, Panel, StatusBadge, Timeline } from '@/components/portal/ui';
import { EditTeamMemberButton } from '@/components/portal/team/TeamDialogs';
import { UserAccessControls } from '@/components/portal/clients/ClientDialogs';
import { ROLE_LABELS } from '@/lib/portal/permissions';
import { fmtDate, fmtDateTime, humanize } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Team member' };

export default async function TeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requirePermission('team.view');
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [row] = await db
    .select({ u: users, e: employees })
    .from(users)
    .leftJoin(employees, eq(employees.userId, users.id))
    .where(and(eq(users.id, id), ne(users.role, 'client')));
  if (!row) notFound();
  const { u, e } = row;

  const [taskRows, projectRows, leave, activity] = await Promise.all([
    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority, dueDate: tasks.dueDate, project: projects.name })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(tasks.assigneeId, id), ne(tasks.status, 'completed')))
      .orderBy(tasks.dueDate),
    db
      .select({ id: projects.id, name: projects.name, status: projects.status, isLead: projectMembers.isLead })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.userId, id)),
    db.select().from(leaveRequests).where(eq(leaveRequests.userId, id)).orderBy(desc(leaveRequests.startDate)).limit(10),
    can(viewer, 'audit.view') || viewer.id === id || can(viewer, 'team.manage')
      ? db.select().from(auditLogs).where(eq(auditLogs.actorId, id)).orderBy(desc(auditLogs.createdAt)).limit(15)
      : Promise.resolve([]),
  ]);

  const manage = can(viewer, 'team.manage') && (u.role !== 'super_admin' || viewer.isSuperAdmin);

  return (
    <>
      <PageHeader
        eyebrow={ROLE_LABELS[u.role]}
        title={u.name}
        description={u.title ?? undefined}
        actions={
          manage ? (
            <EditTeamMemberButton
              canChangeRole={viewer.isSuperAdmin && u.id !== viewer.id}
              member={{
                id: u.id,
                name: u.name,
                title: u.title,
                phone: u.phone,
                role: u.role,
                department: e?.department ?? null,
                weeklyCapacityHours: e?.weeklyCapacityHours ?? 40,
                skills: e?.skills ?? [],
                availability: e?.availability ?? 'available',
              }}
            />
          ) : null
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <Panel>
            <div className="flex items-center gap-4">
              <Avatar name={u.name} size="lg" />
              <div className="min-w-0 space-y-1 text-sm">
                <p className="flex items-center gap-1.5 text-slate-600">
                  <Mail className="h-3.5 w-3.5" /> {u.email}
                </p>
                {u.phone && (
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="h-3.5 w-3.5" /> {u.phone}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <StatusBadge status={e?.availability ?? 'available'} />
                  {!u.isActive && <Badge tone="red">Deactivated</Badge>}
                </div>
              </div>
            </div>
            <div className="mt-5">
              <KeyValue
                items={[
                  { label: 'Department', value: e?.department },
                  { label: 'Joined', value: fmtDate(e?.joinedOn) },
                  { label: 'Capacity', value: `${e?.weeklyCapacityHours ?? 40} h / week` },
                  { label: 'Last sign-in', value: fmtDateTime(u.lastLoginAt) },
                  { label: '2-step verification', value: u.totpEnabled ? 'Enabled' : 'Not enabled' },
                  { label: 'Skills', value: e?.skills?.length ? e.skills.join(', ') : null },
                ]}
              />
            </div>
            {manage && u.id !== viewer.id && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <UserAccessControls userId={u.id} isActive={u.isActive} canManage />
              </div>
            )}
          </Panel>
          <Panel title="Projects">
            {projectRows.length === 0 ? (
              <p className="text-sm text-slate-500">Not assigned to any project.</p>
            ) : (
              <ul className="space-y-2">
                {projectRows.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <Link href={`/portal/projects/${p.id}`} className="truncate text-sm font-medium text-slate-800 hover:text-brand">
                      {p.name} {p.isLead && <Badge tone="brand">Lead</Badge>}
                    </Link>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Leave">
            {leave.length === 0 ? (
              <p className="text-sm text-slate-500">No leave records.</p>
            ) : (
              <ul className="space-y-2">
                {leave.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {humanize(l.type)} · {fmtDate(l.startDate, 'short')}–{fmtDate(l.endDate, 'short')}
                    </span>
                    <StatusBadge status={l.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Open tasks" description={`${taskRows.length} assigned`}>
            {taskRows.length === 0 ? (
              <EmptyState icon={Mail} title="No open tasks" />
            ) : (
              <ul className="divide-y divide-gray-100">
                {taskRows.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <Link href={`/portal/tasks/${t.id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900 hover:text-brand">{t.title}</span>
                      <span className="block text-xs text-slate-500">
                        {t.project} · due {fmtDate(t.dueDate, 'short')}
                      </span>
                    </Link>
                    <StatusBadge status={t.priority} />
                    <StatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {activity.length > 0 && (
            <Panel title="Recent activity" description="From the audit log">
              <Timeline items={activity.map((a) => ({ id: a.id, title: humanize(a.action.replace('.', ' — ')), meta: `${fmtDateTime(a.createdAt)} · ${a.ip ?? ''}` }))} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
