import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '@/server/db';
import { calendarEvents, clients, leaveRequests, meetingAttendees, meetings, projects, tasks, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { calendarEventScope, clientScope, isUuid, leaveScope, meetingScope, projectScope, taskScope } from '@/server/scope';
import { PageHeader, Panel } from '@/components/portal/ui';
import { AddCalendarEventButton } from '@/components/portal/meetings/CalendarEventForm';
import { todayIST } from '@/lib/portal/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Calendar' };

type Kind = 'meeting' | 'task' | 'project' | 'holiday' | 'event' | 'leave';
type Item = { key: string; date: string; title: string; kind: Kind; href?: string; time?: string };

const KIND_STYLE: Record<Kind, { chip: string; dot: string; label: string }> = {
  meeting: { chip: 'bg-brand/10 text-brand', dot: 'bg-brand', label: 'Meetings' },
  task: { chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Task deadlines' },
  project: { chip: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500', label: 'Project deadlines' },
  holiday: { chip: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500', label: 'Holidays' },
  event: { chip: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500', label: 'Events' },
  leave: { chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', label: 'Leave' },
};

function istDate(d: Date) {
  return new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; view?: string; client?: string; project?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const today = todayIST();
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : today.slice(0, 7);
  const [y, mo] = month.split('-').map(Number);
  const first = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const last = `${month}-${String(daysInMonth).padStart(2, '0')}`;
  const view = viewer.isInternal ? (['mine', 'team', 'client', 'project'].includes(sp.view ?? '') ? sp.view! : 'mine') : 'mine';
  const clientId = view === 'client' && isUuid(sp.client) ? sp.client : undefined;
  const projectId = view === 'project' && isUuid(sp.project) ? sp.project : undefined;
  const mine = viewer.isInternal && view === 'mine';

  const rangeStart = new Date(`${first}T00:00:00+05:30`);
  const rangeEnd = new Date(`${last}T23:59:59+05:30`);
  const mineMeeting = mine ? inArray(meetings.id, db.select({ id: meetingAttendees.meetingId }).from(meetingAttendees).where(eq(meetingAttendees.userId, viewer.id))) : undefined;

  const [meetingRows, taskRows, projectRows, eventRows, leaveRows, clientOptions, projectOptions] = await Promise.all([
    db
      .select({ id: meetings.id, title: meetings.title, startsAt: meetings.startsAt })
      .from(meetings)
      .where(and(meetingScope(viewer), eq(meetings.status, 'scheduled'), gte(meetings.startsAt, rangeStart), lte(meetings.startsAt, rangeEnd), mineMeeting, clientId ? eq(meetings.clientId, clientId) : undefined, projectId ? eq(meetings.projectId, projectId) : undefined)),
    db
      .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(taskScope(viewer), ne(tasks.status, 'completed'), gte(tasks.dueDate, first), lte(tasks.dueDate, last), mine ? eq(tasks.assigneeId, viewer.id) : undefined, clientId ? eq(projects.clientId, clientId) : undefined, projectId ? eq(tasks.projectId, projectId) : undefined)),
    db
      .select({ id: projects.id, name: projects.name, dueDate: projects.dueDate })
      .from(projects)
      .where(and(projectScope(viewer), inArray(projects.status, ['planning', 'active', 'on_hold', 'at_risk']), gte(projects.dueDate, first), lte(projects.dueDate, last), clientId ? eq(projects.clientId, clientId) : undefined, projectId ? eq(projects.id, projectId) : undefined)),
    db.select().from(calendarEvents).where(and(calendarEventScope(viewer), lte(calendarEvents.startsOn, last), gte(calendarEvents.endsOn, first))),
    viewer.isInternal && (view === 'team' || view === 'mine')
      ? db
          .select({ id: leaveRequests.id, startDate: leaveRequests.startDate, endDate: leaveRequests.endDate, name: users.name, userId: leaveRequests.userId })
          .from(leaveRequests)
          .innerJoin(users, eq(users.id, leaveRequests.userId))
          .where(and(leaveScope(viewer), eq(leaveRequests.status, 'approved'), lte(leaveRequests.startDate, last), gte(leaveRequests.endDate, first), view === 'mine' ? eq(leaveRequests.userId, viewer.id) : undefined))
      : Promise.resolve([]),
    viewer.isInternal ? db.select({ id: clients.id, name: clients.companyName }).from(clients).where(clientScope(viewer)).orderBy(asc(clients.companyName)) : Promise.resolve([]),
    db.select({ id: projects.id, name: projects.name }).from(projects).where(projectScope(viewer)).orderBy(asc(projects.name)),
  ]);

  const items: Item[] = [];
  for (const m of meetingRows)
    items.push({ key: `m${m.id}`, date: istDate(m.startsAt), title: m.title, kind: 'meeting', href: `/portal/meetings/${m.id}`, time: m.startsAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) });
  for (const t of taskRows) items.push({ key: `t${t.id}`, date: t.dueDate!, title: t.title, kind: 'task', href: `/portal/tasks/${t.id}` });
  for (const p of projectRows) items.push({ key: `p${p.id}`, date: p.dueDate!, title: `${p.name} due`, kind: 'project', href: `/portal/projects/${p.id}` });
  const spread = (from: string, to: string, fn: (d: string) => void) => {
    for (let d = from < first ? first : from; d <= (to > last ? last : to); d = new Date(new Date(`${d}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10)) fn(d);
  };
  for (const e of eventRows) spread(e.startsOn, e.endsOn, (d) => items.push({ key: `e${e.id}${d}`, date: d, title: e.title, kind: e.type === 'holiday' ? 'holiday' : 'event' }));
  for (const l of leaveRows) spread(l.startDate, l.endDate, (d) => items.push({ key: `l${l.id}${d}`, date: d, title: l.userId === viewer.id ? 'You — on leave' : `${l.name} — leave`, kind: 'leave' }));
  items.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  const byDate = new Map<string, Item[]>();
  for (const it of items) byDate.set(it.date, [...(byDate.get(it.date) ?? []), it]);

  // Monday-first grid.
  const leading = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  while (cells.length % 7) cells.push(null);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, mo - 1 + n, 1));
    return d.toISOString().slice(0, 7);
  };
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ month, view, client: clientId, project: projectId, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/portal/calendar?${p}`;
  };
  const monthLabel = new Date(Date.UTC(y, mo - 1, 1)).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const agenda = [...byDate.entries()].filter(([d]) => d >= (month === today.slice(0, 7) ? today : first)).sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <PageHeader eyebrow="Schedule" title="Calendar" description="Meetings, deadlines, holidays and leave in one place." actions={can(viewer, 'calendar.manage') ? <AddCalendarEventButton /> : null} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Link href={qs({ month: shift(-1) })} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-600 hover:border-brand hover:text-brand">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h2 className="min-w-40 text-center text-lg font-semibold tracking-tight text-slate-900">{monthLabel}</h2>
          <Link href={qs({ month: shift(1) })} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-600 hover:border-brand hover:text-brand">
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link href={qs({ month: today.slice(0, 7) })} className="ml-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/5">
            Today
          </Link>
        </div>
        {viewer.isInternal && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
              {[
                { k: 'mine', l: 'My calendar' },
                { k: 'team', l: 'Team' },
                { k: 'client', l: 'Client' },
                { k: 'project', l: 'Project' },
              ].map((f) => (
                <Link key={f.k} href={qs({ view: f.k, client: undefined, project: undefined })} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', view === f.k ? 'bg-brand text-white' : 'text-slate-500 hover:text-slate-900')}>
                  {f.l}
                </Link>
              ))}
            </div>
            {(view === 'client' || view === 'project') && (
              <form className="flex gap-2">
                <input type="hidden" name="month" value={month} />
                <input type="hidden" name="view" value={view} />
                <select name={view} defaultValue={(view === 'client' ? clientId : projectId) ?? ''} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium focus:border-brand focus:outline-none">
                  <option value="">All</option>
                  {(view === 'client' ? clientOptions : projectOptions).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <button className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand">Apply</button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
        {(Object.keys(KIND_STYLE) as Kind[]).filter((k) => viewer.isInternal || k !== 'leave').map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', KIND_STYLE[k].dot)} />
            {KIND_STYLE[k].label}
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-slate-50/60 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            const list = date ? (byDate.get(date) ?? []) : [];
            const isToday = date === today;
            return (
              <div key={i} className={cn('min-h-[72px] border-b border-r border-gray-100 p-1.5 sm:min-h-[118px]', !date && 'bg-slate-50/40', (i + 1) % 7 === 0 && 'border-r-0')}>
                {date && (
                  <>
                    <span className={cn('mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', isToday ? 'bg-brand text-white' : 'text-slate-600')}>{Number(date.slice(8))}</span>
                    <div className="flex flex-wrap gap-0.5 sm:hidden">
                      {list.slice(0, 4).map((it) => (
                        <span key={it.key} className={cn('h-1.5 w-1.5 rounded-full', KIND_STYLE[it.kind].dot)} />
                      ))}
                    </div>
                    <ul className="hidden space-y-0.5 sm:block">
                      {list.slice(0, 3).map((it) => (
                        <li key={it.key}>
                          {it.href ? (
                            <Link href={it.href} className={cn('block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium hover:brightness-95', KIND_STYLE[it.kind].chip)} title={it.title}>
                              {it.time && <span className="mr-1 opacity-70">{it.time}</span>}
                              {it.title}
                            </Link>
                          ) : (
                            <span className={cn('block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium', KIND_STYLE[it.kind].chip)} title={it.title}>
                              {it.title}
                            </span>
                          )}
                        </li>
                      ))}
                      {list.length > 3 && <li className="px-1.5 text-[10.5px] font-semibold text-slate-500">+{list.length - 3} more</li>}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Panel className="mt-6" title="Agenda" description={month === today.slice(0, 7) ? 'From today to the end of the month' : monthLabel}>
        {agenda.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing on the calendar.</p>
        ) : (
          <ol className="space-y-4">
            {agenda.map(([date, list]) => (
              <li key={date} className="grid gap-2 sm:grid-cols-[120px_1fr]">
                <p className={cn('text-sm font-semibold', date === today ? 'text-brand' : 'text-slate-900')}>
                  {new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
                </p>
                <ul className="space-y-1">
                  {list.map((it) => (
                    <li key={it.key} className="flex items-center gap-2 text-sm">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', KIND_STYLE[it.kind].dot)} />
                      {it.time && <span className="w-16 shrink-0 text-xs tabular-nums text-slate-500">{it.time}</span>}
                      {it.href ? (
                        <Link href={it.href} className="truncate text-slate-800 hover:text-brand">
                          {it.title}
                        </Link>
                      ) : (
                        <span className="truncate text-slate-800">{it.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </>
  );
}
