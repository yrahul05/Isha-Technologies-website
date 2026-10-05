import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, desc, eq, gte, inArray, isNull, lt, ne } from 'drizzle-orm';
import { Video } from 'lucide-react';
import { db } from '@/server/db';
import { clients, meetings, projects, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { meetingScope, projectScope, userScope } from '@/server/scope';
import { meetingFormData } from '@/server/queries/meeting-form';
import { Badge, EmptyState, PageHeader, Panel, StatusBadge } from '@/components/portal/ui';
import { MeetingList } from '@/components/portal/widgets';
import { ScheduleMeetingButton } from '@/components/portal/meetings/MeetingForm';
import { RequestMeetingButton } from '@/components/portal/meetings/MeetingRequestForms';
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
  const [upcoming, past, requests, requestForm, form] = await Promise.all([
    base.where(and(meetingScope(viewer), gte(meetings.startsAt, now), eq(meetings.status, 'scheduled'))).orderBy(asc(meetings.startsAt)).limit(100),
    db
      .select({ id: meetings.id, title: meetings.title, startsAt: meetings.startsAt, status: meetings.status, clientName: clients.companyName })
      .from(meetings)
      .leftJoin(clients, eq(clients.id, meetings.clientId))
      .where(and(meetingScope(viewer), lt(meetings.startsAt, now)))
      .orderBy(desc(meetings.startsAt))
      .limit(50),
    // Requests awaiting review (reviewers) / the client's own requests and their outcome.
    db
      .select({ id: meetings.id, title: meetings.title, startsAt: meetings.startsAt, status: meetings.status, clientName: clients.companyName, reviewNote: meetings.reviewNote })
      .from(meetings)
      .leftJoin(clients, eq(clients.id, meetings.clientId))
      .where(and(meetingScope(viewer), viewer.isInternal ? eq(meetings.status, 'requested') : inArray(meetings.status, ['requested', 'rejected'])))
      .orderBy(desc(meetings.createdAt))
      .limit(50),
    !viewer.isInternal && viewer.clientId
      ? Promise.all([
          db.select({ id: projects.id, name: projects.name }).from(projects).where(and(projectScope(viewer), isNull(projects.archivedAt))).orderBy(asc(projects.name)),
          db
            .select({ id: users.id, name: users.name, role: users.role })
            .from(users)
            .where(and(userScope(viewer), eq(users.isActive, true), ne(users.id, viewer.id)))
            .orderBy(asc(users.name)),
        ])
      : Promise.resolve(null),
    viewer.isInternal ? meetingFormData(viewer) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Collaboration"
        title="Meetings"
        description={viewer.isInternal ? 'Schedule Google Meet calls from the portal — no switching tabs.' : 'Your upcoming and past meetings with Isha Technologies.'}
        actions={
          form ? (
            <ScheduleMeetingButton {...form} defaultClientId={sp.client} autoOpen={sp.new === '1'} />
          ) : requestForm ? (
            <RequestMeetingButton projects={requestForm[0]} people={requestForm[1].map((p) => ({ id: p.id, name: p.name, meta: p.role === 'client' ? 'Your team' : 'Isha Technologies' }))} />
          ) : null
        }
      />
      {requests.length > 0 && (
        <Panel className="mb-6" title={viewer.isInternal ? 'Meeting requests awaiting review' : 'Your meeting requests'} description={viewer.isInternal && can(viewer, 'meetings.manage') ? 'Confirm, reschedule, add participants or decline.' : undefined}>
          <ul className="divide-y divide-gray-100">
            {requests.map((r) => (
              <li key={r.id}>
                <Link href={`/portal/meetings/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 py-2.5 hover:text-brand">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800">{r.title}</span>
                    <span className="block text-xs text-slate-500">
                      Proposed {fmtDateTime(r.startsAt)}
                      {viewer.isInternal && r.clientName ? ` · ${r.clientName}` : ''}
                      {r.status === 'rejected' && r.reviewNote ? ` · “${r.reviewNote}”` : ''}
                    </span>
                  </span>
                  <Badge tone={r.status === 'rejected' ? 'red' : 'amber'}>{r.status === 'rejected' ? 'Declined' : 'Awaiting confirmation'}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
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
                    {m.status !== 'scheduled' && <StatusBadge status={m.status} label={m.status === 'rejected' ? 'Declined' : undefined} />}
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
