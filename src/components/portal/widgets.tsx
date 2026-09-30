import Link from 'next/link';
import { ArrowUpRight, CalendarClock, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { daysUntil, fmtDate, fmtTime, relativeTime, toDate } from '@/lib/portal/format';
import { AvatarStack, EmptyState, ProgressBar, StatusBadge, Timeline, toneFor } from './ui';

/** Shared dashboard widgets used by the executive, employee and client views. */

export function ProjectHealthList({
  projects,
}: {
  projects: {
    id: string;
    name: string;
    code: string;
    status: string;
    health: string;
    dueDate: string | null;
    clientName: string;
    progress: { pct: number; done: number; total: number };
    team: string[];
  }[];
}) {
  if (projects.length === 0) return <EmptyState icon={CalendarClock} title="No active projects" description="Projects in planning or delivery will appear here." />;
  return (
    <ul className="-my-1 divide-y divide-gray-100">
      {projects.map((p) => {
        const d = daysUntil(p.dueDate);
        return (
          <li key={p.id}>
            <Link href={`/portal/projects/${p.id}`} className="group -mx-2 grid grid-cols-1 items-center gap-3 rounded-xl px-2 py-3 hover:bg-brand/[0.03] sm:grid-cols-[1fr_180px_auto]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand">{p.name}</span>
                  <StatusBadge status={p.health} />
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {p.clientName} · {p.code} · {p.dueDate ? (d !== null && d < 0 ? `${-d}d overdue` : `due ${fmtDate(p.dueDate, 'short')}`) : 'no due date'}
                </p>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                  <span>
                    {p.progress.done}/{p.progress.total} tasks
                  </span>
                  <span className="font-semibold text-slate-700">{p.progress.pct}%</span>
                </div>
                <ProgressBar value={p.progress.pct} tone={p.health === 'off_track' ? 'red' : p.health === 'at_risk' ? 'amber' : 'brand'} />
              </div>
              <div className="hidden sm:block">{p.team.length > 0 && <AvatarStack names={p.team} max={3} />}</div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function MeetingList({
  meetings,
}: {
  meetings: { id: string; title: string; startsAt: Date; durationMinutes: number; meetingLink: string | null; clientName: string | null }[];
}) {
  if (meetings.length === 0) return <EmptyState icon={Video} title="No upcoming meetings" description="Scheduled meetings for the next two weeks show here." />;
  return (
    <ul className="space-y-2.5">
      {meetings.map((m) => {
        const start = toDate(m.startsAt)!;
        const live = Date.now() >= start.getTime() - 10 * 60_000 && Date.now() <= start.getTime() + m.durationMinutes * 60_000;
        return (
          <li key={m.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:border-brand/30">
            <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-brand/10 py-1.5 text-brand">
              <span className="text-[10px] font-semibold uppercase">{start.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })}</span>
              <span className="text-lg font-bold leading-none">{start.toLocaleString('en-IN', { day: 'numeric', timeZone: 'Asia/Kolkata' })}</span>
            </div>
            <Link href={`/portal/meetings/${m.id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 hover:text-brand">{m.title}</p>
              <p className="truncate text-xs text-slate-500">
                {fmtTime(start)} · {m.durationMinutes} min{m.clientName ? ` · ${m.clientName}` : ''}
              </p>
            </Link>
            {m.meetingLink && (
              <a
                href={m.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                  live ? 'bg-brand text-white hover:bg-[#2f6ccd]' : 'border border-brand/30 text-brand hover:bg-brand/5'
                )}
              >
                <Video className="h-3.5 w-3.5" /> {live ? 'Join now' : 'Join'}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function DeadlineList({
  items,
}: {
  items: { id: string; title: string; dueDate: string | null; status: string; project: string; overdue?: boolean }[];
}) {
  if (items.length === 0) return <EmptyState icon={CalendarClock} title="Nothing due soon" description="Deadlines for the next two weeks appear here." />;
  return (
    <ul className="space-y-1">
      {items.map((t) => {
        const d = daysUntil(t.dueDate);
        return (
          <li key={t.id}>
            <Link href={`/portal/tasks/${t.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-brand/[0.03]">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', t.overdue ? 'bg-rose-500' : d !== null && d <= 2 ? 'bg-amber-500' : 'bg-brand')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-slate-800">{t.title}</span>
                <span className="block truncate text-xs text-slate-500">{t.project}</span>
              </span>
              <span className={cn('shrink-0 text-xs font-semibold tabular-nums', t.overdue ? 'text-rose-600' : 'text-slate-500')}>
                {d === null ? '—' : d < 0 ? `${-d}d late` : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : fmtDate(t.dueDate, 'short')}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityFeed({ items }: { items: { id: string; summary: string; createdAt: Date; actor: string | null }[] }) {
  return (
    <Timeline
      items={items.map((a) => ({
        id: a.id,
        title: a.summary,
        meta: `${a.actor ?? 'System'} · ${relativeTime(a.createdAt)}`,
      }))}
    />
  );
}

export function NotificationList({ items }: { items: { id: string; title: string; body: string; createdAt: Date; readAt: Date | null; link: string | null; priority: string }[] }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">You&rsquo;re all caught up.</p>;
  return (
    <ul className="space-y-1">
      {items.map((n) => (
        <li key={n.id}>
          <Link href={n.link ?? '/portal/notifications'} className="flex gap-3 rounded-lg px-2 py-2 hover:bg-brand/[0.03]">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-slate-200' : n.priority === 'urgent' ? 'bg-rose-500' : 'bg-brand')} />
            <span className="min-w-0">
              <span className={cn('block truncate text-sm', n.readAt ? 'text-slate-600' : 'font-semibold text-slate-900')}>{n.title}</span>
              <span className="block truncate text-xs text-slate-500">
                {n.body ? `${n.body} · ` : ''}
                {relativeTime(n.createdAt)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ViewAll({ href, label = 'View all' }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand hover:underline">
      {label} <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export function StatusDot({ status }: { status: string }) {
  const tone = toneFor(status);
  return <span className={cn('inline-block h-2 w-2 rounded-full', tone === 'green' ? 'bg-emerald-500' : tone === 'red' ? 'bg-rose-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-brand')} />;
}
