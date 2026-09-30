import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, desc, eq, gte, lt } from 'drizzle-orm';
import { Video } from 'lucide-react';
import { db } from '@/server/db';
import { clients, meetings, projects, users } from '@/server/db/schema';
import { requireViewer } from '@/server/auth/viewer';
import { meetingScope } from '@/server/scope';
import { meetingFormData } from '@/server/queries/meeting-form';
import { EmptyState, PageHeader, Panel, StatusBadge } from '@/components/portal/ui';
import { MeetingList } from '@/components/portal/widgets';
import { ScheduleMeetingButton } from '@/components/portal/meetings/MeetingForm';
import { fmtDateTime } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Meetings' };

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<{ new?: string; client?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const now = new Date(Date.now() - 60 * 60 * 1000);
  const base = db
    .select({ id: meetings.id, title: meetings.title, startsAt: meetings.startsAt, durationMinutes: meetings.durationMinutes, meetingLink: meetings.meetingLink, status: meetings.status, clientName: clients.companyName, projectName: projects.name, organizer: users.name, provider: meetings.provider })
    .from(meetings)
    .leftJoin(clients, eq(clients.id, meetings.clientId))
    .leftJoin(projects, eq(projects.id, meetings.projectId))
    .leftJoin(users, eq(users.id, meetings.organizerId));
  const [upcoming, past] = await Promise.all([
    base.where(and(meetingScope(viewer), gte(meetings.startsAt, now), eq(meetings.status, 'scheduled'))).orderBy(asc(meetings.startsAt)).limit(100),
    db
      .select({ id: meetings.id, title: meetings.title, startsAt: meetings.startsAt, status: meetings.status, clientName: clients.companyName })
      .from(meetings)
      .leftJoin(clients, eq(clients.id, meetings.clientId))
      .where(and(meetingScope(viewer), lt(meetings.startsAt, now)))
      .orderBy(desc(meetings.startsAt))
      .limit(50),
  ]);
  const form = viewer.isInternal ? await meetingFormData(viewer) : null;

  return (
    <>
      <PageHeader
        eyebrow="Collaboration"
        title="Meetings"
        description={viewer.isInternal ? 'Schedule Google Meet calls from the portal — no switching tabs.' : 'Your upcoming and past meetings with Isha Technologies.'}
        actions={form ? <ScheduleMeetingButton {...form} defaultClientId={sp.client} autoOpen={sp.new === '1'} /> : null}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Upcoming" className="xl:col-span-2">
          {upcoming.length === 0 ? <EmptyState icon={Video} title="Nothing scheduled" /> : <MeetingList meetings={upcoming} />}
        </Panel>
        <Panel title="Past meetings">
          {past.length === 0 ? (
            <p className="text-sm text-slate-500">No past meetings.</p>
          ) : (
            <ul className="space-y-1">
              {past.map((m) => (
                <li key={m.id}>
                  <Link href={`/portal/meetings/${m.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-brand/[0.03]">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-slate-800">{m.title}</span>
                      <span className="block text-xs text-slate-500">
                        {fmtDateTime(m.startsAt)}
                        {m.clientName ? ` · ${m.clientName}` : ''}
                      </span>
                    </span>
                    {m.status === 'cancelled' && <StatusBadge status="cancelled" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
