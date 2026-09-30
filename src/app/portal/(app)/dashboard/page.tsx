import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlarmClock,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FolderKanban,
  Hourglass,
  LifeBuoy,
  Megaphone,
  ReceiptIndianRupee,
  Target,
  Wallet,
} from 'lucide-react';
import { requireViewer, type Viewer } from '@/server/auth/viewer';
import { getClientDashboard, getEmployeeDashboard, getExecutiveDashboard } from '@/server/queries/dashboard';
import { Avatar, Badge, EmptyState, PageHeader, Panel, StatCard, StatusBadge } from '@/components/portal/ui';
import { ActivityFeed, DeadlineList, MeetingList, NotificationList, ProjectHealthList, ViewAll } from '@/components/portal/widgets';
import { BarList, ColumnChart, ProgressRing } from '@/components/portal/charts';
import { formatINR } from '@/lib/portal/invoice-math';
import { fmtDate, humanize, relativeTime } from '@/lib/portal/format';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Dashboard' };

function greeting(name: string) {
  const hour = Number(new Date().toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }));
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name.split(' ')[0]}`;
}

const inrCompact = (paise: number) => formatINR(paise, { compact: true });

export default async function DashboardPage() {
  const viewer = await requireViewer();
  if (!viewer.isInternal) return <ClientDashboard viewer={viewer} />;
  if (viewer.role === 'employee') return <EmployeeDashboard viewer={viewer} />;
  return <ExecutiveDashboard viewer={viewer} />;
}

async function ExecutiveDashboard({ viewer }: { viewer: Viewer }) {
  const d = await getExecutiveDashboard(viewer);
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });

  return (
    <>
      <PageHeader
        eyebrow={today}
        title={greeting(viewer.name)}
        description="Your operating picture across clients, delivery, finance and support."
        actions={
          <>
            <Button asChild variant="secondary" className="h-10 rounded-lg px-4 text-sm">
              <Link href="/portal/projects?new=1">New project</Link>
            </Button>
            <Button asChild variant="primary" className="h-10 rounded-lg px-4 text-sm">
              <Link href="/portal/invoices/new">Create invoice</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active clients" value={d.clients} icon={Building2} href="/portal/clients" hint={`${d.openLeads} open leads`} />
        <StatCard
          label="Active projects"
          value={d.projects.active}
          icon={FolderKanban}
          href="/portal/projects"
          hint={`${d.projects.completed} completed`}
          trend={d.projects.atRisk ? { direction: 'up', label: `${d.projects.atRisk} at risk`, good: false } : undefined}
        />
        <StatCard
          label="Pending tasks"
          value={d.tasks.pending}
          icon={ClipboardList}
          tone={d.tasks.overdue ? 'amber' : 'brand'}
          href="/portal/tasks"
          hint={`${d.tasks.review} in review · ${d.tasks.blocked} blocked`}
          trend={d.tasks.overdue ? { direction: 'up', label: `${d.tasks.overdue} overdue`, good: false } : undefined}
        />
        <StatCard label="Open tickets" value={d.openTickets} icon={LifeBuoy} tone="sky" href="/portal/tickets" />
        {d.finance && (
          <>
            <StatCard label="Total revenue collected" value={inrCompact(d.finance.totalCollectedPaise)} icon={CircleDollarSign} tone="green" href="/portal/reports" hint="Lifetime payments" />
            <StatCard label="Outstanding amount" value={inrCompact(d.finance.outstandingPaise)} icon={Wallet} href="/portal/invoices?status=outstanding" hint={`${d.finance.outstandingCount} unpaid invoices`} />
            <StatCard
              label="Overdue payments"
              value={inrCompact(d.finance.overduePaise)}
              icon={AlarmClock}
              tone={d.finance.overdueCount ? 'red' : 'slate'}
              href="/portal/invoices?status=overdue"
              hint={`${d.finance.overdueCount} invoices past due`}
            />
            <StatCard label="Upcoming meetings" value={d.meetingsSoon.length} icon={Hourglass} tone="violet" href="/portal/meetings" hint="Next 14 days" />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {d.finance && (
            <Panel title="Monthly revenue" description="Payments received, last 6 months" action={<ViewAll href="/portal/reports" label="Reports" />}>
              <ColumnChart data={d.finance.monthly} format="inr-compact" ariaLabel="Payments received per month, last six months" />
            </Panel>
          )}
          <Panel title="Project health" description="Live projects ordered by due date" action={<ViewAll href="/portal/projects" />}>
            <ProjectHealthList projects={d.projectsLive} />
          </Panel>
          <Panel title="Recent activity" action={<ViewAll href="/portal/audit" label="Audit log" />}>
            <ActivityFeed items={d.activity} />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Upcoming meetings" action={<ViewAll href="/portal/calendar" label="Calendar" />}>
            <MeetingList meetings={d.meetingsSoon} />
          </Panel>
          <Panel title="Upcoming deadlines" action={<ViewAll href="/portal/tasks" />}>
            <DeadlineList items={d.deadlines} />
          </Panel>
          {d.team.length > 0 && (
            <Panel title="Team availability" description="Open tasks per person" action={<ViewAll href="/portal/team" />}>
              <ul className="space-y-2.5">
                {d.team.map((m) => {
                  const state = m.onLeave ? 'on_leave' : (m.availability ?? 'available');
                  return (
                    <li key={m.id} className="flex items-center gap-3">
                      <Avatar name={m.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{m.name}</span>
                        <span className="block truncate text-[11px] text-slate-500">{m.title ?? 'Team member'}</span>
                      </span>
                      <span className="text-xs tabular-nums text-slate-500">{m.openTasks} open</span>
                      <StatusBadge status={state} />
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
          <Panel title="Recent notifications" action={<ViewAll href="/portal/notifications" />}>
            <NotificationList items={d.notes} />
          </Panel>
          <Panel title="Projects by status">
            <BarList
              rows={['planning', 'active', 'at_risk', 'on_hold', 'completed', 'cancelled'].map((s) => ({
                key: s,
                label: humanize(s),
                value: d.projects.byStatus[s] ?? 0,
              }))}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

async function EmployeeDashboard({ viewer }: { viewer: Viewer }) {
  const d = await getEmployeeDashboard(viewer);
  return (
    <>
      <PageHeader eyebrow="Your workspace" title={greeting(viewer.name)} description="Everything assigned to you, and nothing that isn't." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My projects" value={d.myProjects.length} icon={FolderKanban} href="/portal/projects" />
        <StatCard label="My open tasks" value={d.myTasks.length} icon={ClipboardList} href="/portal/tasks?mine=1" />
        <StatCard label="Today's focus" value={d.todays.length} icon={Target} tone="amber" hint="In progress or due today" />
        <StatCard label="Pending reviews" value={d.reviews.length} icon={CheckCircle2} tone="violet" href="/portal/tasks?status=review" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Today's work" action={<ViewAll href="/portal/tasks?mine=1" label="My tasks" />}>
            {d.todays.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing urgent today" description="Tasks in progress or due today will appear here." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {d.todays.map((t) => (
                  <li key={t.id}>
                    <Link href={`/portal/tasks/${t.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-brand/[0.03]">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{t.title}</span>
                        <span className="block text-xs text-slate-500">
                          {t.project} · due {fmtDate(t.dueDate, 'short')}
                        </span>
                      </span>
                      <StatusBadge status={t.priority} />
                      <StatusBadge status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="My projects" action={<ViewAll href="/portal/projects" />}>
            <ProjectHealthList projects={d.myProjects} />
          </Panel>
          {d.reviews.length > 0 && (
            <Panel title="Pending reviews" description="Tasks awaiting review on your projects">
              <ul className="space-y-1">
                {d.reviews.map((t) => (
                  <li key={t.id}>
                    <Link href={`/portal/tasks/${t.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-brand/[0.03]">
                      <span className="min-w-0 truncate text-sm text-slate-800">{t.title}</span>
                      <span className="shrink-0 text-xs text-slate-500">{t.assignee ?? 'Unassigned'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <div className="space-y-6">
          <Panel title="Upcoming deadlines">
            <DeadlineList items={d.deadlines} />
          </Panel>
          <Panel title="Meetings" action={<ViewAll href="/portal/calendar" label="Calendar" />}>
            <MeetingList meetings={d.meetingsSoon} />
          </Panel>
          <Panel title="Announcements & leave" action={<ViewAll href="/portal/leave" label="Leave" />}>
            <ul className="space-y-3">
              {d.announcements.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800">{a.title}</span>
                    <span className="block text-xs text-slate-500">{relativeTime(a.createdAt)}</span>
                  </span>
                </li>
              ))}
              {d.leave.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>
                    {humanize(l.type)} leave · {fmtDate(l.startDate, 'short')}–{fmtDate(l.endDate, 'short')}
                  </span>
                  <StatusBadge status={l.status} />
                </li>
              ))}
              {d.announcements.length === 0 && d.leave.length === 0 && <p className="text-sm text-slate-500">No announcements.</p>}
            </ul>
          </Panel>
          <Panel title="Recent documents" action={<ViewAll href="/portal/documents" />}>
            <DocList docs={d.docs} />
          </Panel>
          <Panel title="Notifications" action={<ViewAll href="/portal/notifications" />}>
            <NotificationList items={d.notes} />
          </Panel>
        </div>
      </div>
    </>
  );
}

function DocList({ docs }: { docs: { id: string; name: string; updatedAt: Date; project: string | null }[] }) {
  if (docs.length === 0) return <p className="text-sm text-slate-500">No documents yet.</p>;
  return (
    <ul className="space-y-1">
      {docs.map((doc) => (
        <li key={doc.id}>
          <Link href={`/portal/documents?doc=${doc.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-brand/[0.03]">
            <FileText className="h-4 w-4 shrink-0 text-brand" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-slate-800">{doc.name}</span>
              <span className="block truncate text-xs text-slate-500">
                {doc.project ?? 'General'} · {relativeTime(doc.updatedAt)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function ClientDashboard({ viewer }: { viewer: Viewer }) {
  const d = await getClientDashboard(viewer);
  const overall = d.projectsLive.length
    ? Math.round(d.projectsLive.reduce((s, p) => s + p.progress.pct, 0) / d.projectsLive.length)
    : 0;

  return (
    <>
      <PageHeader eyebrow={viewer.clientName ?? 'Your account'} title={greeting(viewer.name)} description="Live status of your work with Isha Technologies." />

      <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand/90 to-[#2f6ccd] p-6 text-white md:p-8">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-30">
          <defs>
            <pattern id="client-hero-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white" fillOpacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#client-hero-grid)" />
        </svg>
        <div className="relative grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="rounded-2xl bg-white p-2 shadow-lg">
            <ProgressRing value={overall} size={84} label={`Overall progress ${overall}%`} />
          </div>
          <div>
            <p className="text-[13px] font-medium uppercase tracking-widest text-white/80">Overall delivery progress</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {d.projectsLive.length} active {d.projectsLive.length === 1 ? 'project' : 'projects'} · {d.completedProjects} completed
            </p>
            <p className="mt-1 text-sm text-white/85">
              {d.pendingTasks.length ? `${d.pendingTasks.length} items need attention` : 'Nothing is waiting on you right now.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-72">
            <div className="rounded-xl bg-white/15 p-3 ring-1 ring-white/20 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-white/75">Amount due</p>
              <p className="text-lg font-bold tabular-nums">{formatINR(d.invoices.duePaise, { compact: true })}</p>
            </div>
            <div className="rounded-xl bg-white/15 p-3 ring-1 ring-white/20 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-white/75">Paid to date</p>
              <p className="text-lg font-bold tabular-nums">{formatINR(d.invoices.lifetimePaidPaise, { compact: true })}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Open tickets" value={d.ticketsOpen.length} icon={LifeBuoy} tone="sky" href="/portal/tickets" />
        <StatCard label="Upcoming meetings" value={d.meetingsSoon.length} icon={Hourglass} tone="violet" href="/portal/meetings" />
        <StatCard label="Outstanding invoices" value={d.invoices.outstandingCount} icon={ReceiptIndianRupee} tone={d.invoices.overduePaise ? 'red' : 'brand'} href="/portal/invoices" hint={d.invoices.overduePaise ? `${formatINR(d.invoices.overduePaise, { compact: true })} overdue` : undefined} />
        <StatCard label="Paid invoices" value={d.invoices.paidCount} icon={CheckCircle2} tone="green" href="/portal/invoices?status=paid" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Your projects" action={<ViewAll href="/portal/projects" />}>
            <ProjectHealthList projects={d.projectsLive} />
          </Panel>
          <Panel title="Waiting on you & in progress" description="Items shared with your team" action={<ViewAll href="/portal/tasks" />}>
            {d.pendingTasks.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="All clear" description="No shared action items right now." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {d.pendingTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <Link href={`/portal/tasks/${t.id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900 hover:text-brand">{t.title}</span>
                      <span className="block text-xs text-slate-500">
                        {t.project}
                        {t.dueDate ? ` · due ${fmtDate(t.dueDate, 'short')}` : ''}
                      </span>
                    </Link>
                    <StatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Project timeline" description="Recent updates from your projects">
            <ActivityFeed items={d.activity} />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Outstanding invoices" action={<ViewAll href="/portal/invoices" label="Payment history" />}>
            {d.invoices.outstanding.length === 0 ? (
              <p className="text-sm text-slate-500">No outstanding invoices. Thank you!</p>
            ) : (
              <ul className="space-y-2">
                {d.invoices.outstanding.map((inv) => (
                  <li key={inv.id}>
                    <Link href={`/portal/invoices/${inv.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:border-brand/30">
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{inv.number}</span>
                        <span className="block text-xs text-slate-500">Due {fmtDate(inv.dueDate)}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-sm font-bold tabular-nums text-slate-900">{formatINR(inv.totalPaise - inv.paidPaise)}</span>
                        {inv.dueDate < new Date().toISOString().slice(0, 10) ? <Badge tone="red">Overdue</Badge> : <span className="text-[11px] text-slate-500">of {formatINR(inv.totalPaise)}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Upcoming meetings" action={<ViewAll href="/portal/meetings" />}>
            <MeetingList meetings={d.meetingsSoon} />
          </Panel>
          <Panel title="Open tickets" action={<ViewAll href="/portal/tickets" label="Support" />}>
            {d.ticketsOpen.length === 0 ? (
              <p className="text-sm text-slate-500">No open tickets.</p>
            ) : (
              <ul className="space-y-1">
                {d.ticketsOpen.map((t) => (
                  <li key={t.id}>
                    <Link href={`/portal/tickets/${t.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-brand/[0.03]">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-slate-800">{t.subject}</span>
                        <span className="block text-xs text-slate-500">
                          {t.number} · {relativeTime(t.updated)}
                        </span>
                      </span>
                      <StatusBadge status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Latest documents" action={<ViewAll href="/portal/documents" />}>
            <DocList docs={d.docs} />
          </Panel>
          <Panel title="Notifications" action={<ViewAll href="/portal/notifications" />}>
            <NotificationList items={d.notes} />
          </Panel>
          <Panel title="Need something changed?">
            <p className="text-sm text-slate-600">
              Billing details, company information and key documents are updated through a reviewed change request.
            </p>
            <Link href="/portal/change-requests" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              <AlertTriangle className="h-4 w-4" /> Request a change
            </Link>
          </Panel>
        </div>
      </div>
    </>
  );
}
