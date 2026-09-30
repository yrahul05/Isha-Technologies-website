import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { CalendarClock, CalendarRange, ClipboardCheck, FolderLock, LifeBuoy, Wallet } from 'lucide-react';
import { db } from '@/server/db';
import { activities, clients, documents, meetings, projectMembers, tickets, users, tasks } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { activityScope, documentScope, findVisibleProject, isProjectMember, isUuid, meetingScope, ticketScope } from '@/server/scope';
import { projectProgress } from '@/server/queries/common';
import { boardTasks } from '@/server/queries/tasks';
import { clientPeople, internalPeople } from '@/server/queries/people';
import { Avatar, Badge, EmptyState, PageHeader, Panel, StatCard, StatusBadge, Tabs, Timeline } from '@/components/portal/ui';
import { ProgressRing } from '@/components/portal/charts';
import { KanbanBoard } from '@/components/portal/tasks/KanbanBoard';
import { NewTaskButton } from '@/components/portal/tasks/TaskForm';
import { EditProjectButton } from '@/components/portal/projects/ProjectForm';
import { DocumentRowList } from '@/components/portal/documents/DocumentRowList';
import { UploadButton } from '@/components/portal/documents/Uploader';
import { formatINR } from '@/lib/portal/invoice-math';
import { daysUntil, fmtDate, fmtDateTime, relativeTime } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Project' };

const TABS = ['overview', 'tasks', 'documents', 'meetings', 'tickets', 'activity'] as const;

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  if (!isUuid(id)) notFound();
  const project = await findVisibleProject(viewer, id);
  if (!project) notFound();
  const tab = (TABS as readonly string[]).includes(rawTab ?? '') ? rawTab! : 'overview';

  const [[client], members, progressMap, taskItems, docs, meetingRows, ticketRows, activity] = await Promise.all([
    db.select({ name: clients.companyName, id: clients.id }).from(clients).where(eq(clients.id, project.clientId)),
    db
      .select({ id: users.id, name: users.name, title: users.title, type: projectMembers.memberType, isLead: projectMembers.isLead })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, id))
      .orderBy(desc(projectMembers.isLead), asc(users.name)),
    projectProgress([id]),
    boardTasks(viewer, eq(tasks.projectId, id)),
    db.select().from(documents).where(and(eq(documents.projectId, id), documentScope(viewer))).orderBy(desc(documents.updatedAt)),
    db.select().from(meetings).where(and(eq(meetings.projectId, id), meetingScope(viewer))).orderBy(desc(meetings.startsAt)),
    db.select().from(tickets).where(and(eq(tickets.projectId, id), ticketScope(viewer))).orderBy(desc(tickets.lastActivityAt)),
    db
      .select({ a: activities, actor: users.name })
      .from(activities)
      .leftJoin(users, eq(users.id, activities.actorId))
      .where(and(eq(activities.projectId, id), activityScope(viewer)))
      .orderBy(desc(activities.createdAt))
      .limit(60),
  ]);
  const progress = progressMap.get(id)!;
  const d = daysUntil(project.dueDate);
  const overdueTasks = taskItems.filter((t) => t.status !== 'completed' && t.dueDate && (daysUntil(t.dueDate) ?? 0) < 0).length;
  const team = members.filter((m) => m.type === 'team');
  const clientMembers = members.filter((m) => m.type === 'client');

  const manage = can(viewer, 'projects.manage');
  const canCreateTasks = viewer.isInternal && (can(viewer, 'tasks.manage') || (await isProjectMember(viewer, id)));
  const people = canCreateTasks || manage ? await internalPeople(viewer) : [];
  const editExtras = manage
    ? {
        clients: await db.select({ id: clients.id, name: clients.companyName }).from(clients).where(ne(clients.status, 'inactive')),
        clientPeople: await clientPeople(viewer, project.clientId),
      }
    : null;
  const lead = team.find((m) => m.isLead);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'tasks', label: 'Tasks', count: taskItems.length },
    { key: 'documents', label: 'Documents', count: docs.length },
    { key: 'meetings', label: 'Meetings', count: meetingRows.length },
    { key: 'tickets', label: 'Tickets', count: ticketRows.length },
    { key: 'activity', label: 'Activity' },
  ].map((t) => ({ ...t, href: `/portal/projects/${id}${t.key === 'overview' ? '' : `?tab=${t.key}`}` }));

  return (
    <>
      <PageHeader
        eyebrow={`${project.code} · ${client.name}`}
        title={project.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <StatusBadge status={project.health} />
            <StatusBadge status={project.priority} label={`${project.priority[0].toUpperCase()}${project.priority.slice(1)} priority`} />
          </span>
        }
        actions={
          <>
            {manage && editExtras && (
              <EditProjectButton
                clients={editExtras.clients}
                team={people}
                clientPeople={editExtras.clientPeople}
                initial={{
                  id: project.id,
                  name: project.name,
                  clientId: project.clientId,
                  description: project.description,
                  status: project.status,
                  priority: project.priority,
                  health: project.health,
                  startDate: project.startDate,
                  dueDate: project.dueDate,
                  budgetPaise: project.budgetPaise,
                  technologies: project.technologies,
                  teamIds: team.map((m) => m.id),
                  leadId: lead?.id ?? null,
                  clientMemberIds: clientMembers.map((m) => m.id),
                }}
              />
            )}
            {canCreateTasks && <NewTaskButton projects={[{ id, name: project.name }]} people={people} defaultProjectId={id} />}
          </>
        }
      />

      <section className="relative mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-60">
          <defs>
            <pattern id="project-grid" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" className="fill-brand/10" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#project-grid)" />
        </svg>
        <div className="relative grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
          <ProgressRing value={progress.pct} size={92} label={`Project progress ${progress.pct}%`} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Tasks completed" value={`${progress.done}/${progress.total}`} icon={ClipboardCheck} hint={overdueTasks ? `${overdueTasks} overdue` : 'None overdue'} tone={overdueTasks ? 'amber' : 'brand'} />
            <StatCard
              label="Expected completion"
              value={fmtDate(project.dueDate, 'short')}
              icon={CalendarRange}
              tone={d !== null && d < 0 && project.status !== 'completed' ? 'red' : 'violet'}
              hint={project.status === 'completed' ? `Completed ${fmtDate(project.completedAt, 'short')}` : d === null ? 'Not set' : d < 0 ? `${-d} days overdue` : `${d} days remaining`}
            />
            <StatCard label="Started" value={fmtDate(project.startDate, 'short')} icon={CalendarClock} tone="sky" />
            {viewer.isInternal && can(viewer, 'invoices.view') ? (
              <StatCard label="Budget" value={project.budgetPaise ? formatINR(project.budgetPaise, { compact: true }) : '—'} icon={Wallet} tone="green" />
            ) : (
              <StatCard label="Open tickets" value={ticketRows.filter((t) => !['resolved', 'closed'].includes(t.status)).length} icon={LifeBuoy} tone="green" />
            )}
          </div>
        </div>
      </section>

      <Tabs tabs={tabs} active={tab} />

      {tab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Panel title="About this project">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{project.description || 'No description yet.'}</p>
              {project.technologies.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {project.technologies.map((t) => (
                    <span key={t} className="rounded-lg bg-brand/[0.06] px-2 py-1 text-xs font-medium text-brand ring-1 ring-inset ring-brand/15">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title="Milestones & open work" action={<Link href={`?tab=tasks`} className="text-xs font-semibold text-brand">Board</Link>}>
              <ul className="divide-y divide-gray-100">
                {taskItems
                  .filter((t) => t.status !== 'completed')
                  .slice(0, 8)
                  .map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-2.5">
                      <Link href={`/portal/tasks/${t.id}`} className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900 hover:text-brand">{t.title}</span>
                        <span className="block text-xs text-slate-500">
                          {t.assignee ?? 'Unassigned'} · due {fmtDate(t.dueDate, 'short')}
                        </span>
                      </Link>
                      <StatusBadge status={t.status} />
                    </li>
                  ))}
                {taskItems.every((t) => t.status === 'completed') && <li className="py-3 text-sm text-slate-500">No open work.</li>}
              </ul>
            </Panel>
            <Panel title="Recent activity">
              <Timeline items={activity.slice(0, 8).map((r) => ({ id: r.a.id, title: r.a.summary, meta: `${r.actor ?? 'System'} · ${relativeTime(r.a.createdAt)}` }))} />
            </Panel>
          </div>
          <div className="space-y-6">
            <Panel title="Team" description="Isha Technologies">
              <MemberList members={team} />
            </Panel>
            <Panel title="Client members" description={client.name}>
              <MemberList members={clientMembers} empty="No client members added." />
            </Panel>
            <Panel title="Upcoming meetings">
              <ul className="space-y-2">
                {meetingRows
                  .filter((m) => m.startsAt > new Date() && m.status === 'scheduled')
                  .slice(0, 3)
                  .map((m) => (
                    <li key={m.id}>
                      <Link href={`/portal/meetings/${m.id}`} className="block rounded-lg border border-gray-100 px-3 py-2 hover:border-brand/30">
                        <span className="block text-sm font-medium text-slate-900">{m.title}</span>
                        <span className="text-xs text-slate-500">{fmtDateTime(m.startsAt)}</span>
                      </Link>
                    </li>
                  ))}
                {!meetingRows.some((m) => m.startsAt > new Date() && m.status === 'scheduled') && <li className="text-sm text-slate-500">None scheduled.</li>}
              </ul>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'tasks' && (taskItems.length ? <KanbanBoard tasks={taskItems} showProject={false} /> : <Panel><EmptyState icon={ClipboardCheck} title="No tasks yet" /></Panel>)}

      {tab === 'documents' && (
        <Panel action={<UploadButton target={{ projectId: id }} label="Upload" compact />}>
          {docs.length ? <DocumentRowList docs={docs} showVisibility={viewer.isInternal} /> : <EmptyState icon={FolderLock} title="No documents yet" />}
        </Panel>
      )}

      {tab === 'meetings' && (
        <Panel>
          {meetingRows.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No meetings" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {meetingRows.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/portal/meetings/${m.id}`} className="text-sm font-medium text-slate-900 hover:text-brand">
                    {m.title}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    {fmtDateTime(m.startsAt)} <StatusBadge status={m.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'tickets' && (
        <Panel>
          {ticketRows.length === 0 ? (
            <EmptyState icon={LifeBuoy} title="No tickets" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {ticketRows.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/portal/tickets/${t.id}`} className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900 hover:text-brand">{t.subject}</span>
                    <span className="text-xs text-slate-500">{t.number}</span>
                  </Link>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'activity' && (
        <Panel title="Activity timeline">
          <Timeline
            items={activity.map((r) => ({
              id: r.a.id,
              title: r.a.summary,
              meta: `${r.actor ?? 'System'} · ${fmtDateTime(r.a.createdAt)}${viewer.isInternal && r.a.visibility === 'internal' ? ' · internal' : ''}`,
              tone: r.a.visibility === 'client' ? 'brand' : 'slate',
            }))}
          />
        </Panel>
      )}
    </>
  );
}

function MemberList({ members, empty = 'No one assigned.' }: { members: { id: string; name: string; title: string | null; isLead: boolean }[]; empty?: string }) {
  if (members.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {members.map((m) => (
        <li key={m.id} className="flex items-center gap-3">
          <Avatar name={m.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-800">{m.name}</span>
            <span className="block truncate text-xs text-slate-500">{m.title ?? '—'}</span>
          </span>
          {m.isLead && <Badge tone="brand">Lead</Badge>}
        </li>
      ))}
    </ul>
  );
}

