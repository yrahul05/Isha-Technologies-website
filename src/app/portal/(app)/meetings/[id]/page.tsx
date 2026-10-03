import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { ArrowLeft, CalendarClock, Clock, Video } from 'lucide-react';
import { db } from '@/server/db';
import { clients, meetingActionItems, meetingAttendees, meetings, projects, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { isUuid, meetingScope } from '@/server/scope';
import { meetingFormData } from '@/server/queries/meeting-form';
import { Avatar, Badge, KeyValue, PageHeader, Panel, StatusBadge } from '@/components/portal/ui';
import { CancelMeetingButton, EditMeetingButton } from '@/components/portal/meetings/MeetingForm';
import { ReviewMeetingRequestForm } from '@/components/portal/meetings/MeetingRequestForms';
import { clientPeople, internalPeople } from '@/server/queries/people';
import { getGoogleAccount } from '@/server/google';
import { Button } from '@/components/ui/button';
import { ActionItems, MinutesForm } from '@/components/portal/meetings/MeetingNotes';
import { fmtDateTime, fmtTime } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Meeting' };

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [row] = await db
    .select({ m: meetings, clientName: clients.companyName, projectName: projects.name, organizer: users.name })
    .from(meetings)
    .leftJoin(clients, eq(clients.id, meetings.clientId))
    .leftJoin(projects, eq(projects.id, meetings.projectId))
    .leftJoin(users, eq(users.id, meetings.organizerId))
    .where(and(eq(meetings.id, id), meetingScope(viewer)));
  if (!row) notFound();
  const { m } = row;
  const attendees = await db
    .select({ id: users.id, name: users.name, role: users.role, title: users.title })
    .from(meetingAttendees)
    .innerJoin(users, eq(users.id, meetingAttendees.userId))
    .where(eq(meetingAttendees.meetingId, id));

  // Minutes & action items: internal readers always, clients only once the team shares them.
  const canWriteNotes = viewer.isInternal && ['scheduled', 'completed'].includes(m.status) && (m.organizerId === viewer.id || can(viewer, 'meetings.manage'));
  const showNotes = viewer.isInternal ? ['scheduled', 'completed'].includes(m.status) : m.minutesVisibility === 'client';
  const actionItems = showNotes
    ? await db
        .select({ i: meetingActionItems, assignee: users.name })
        .from(meetingActionItems)
        .leftJoin(users, eq(users.id, meetingActionItems.assigneeId))
        .where(eq(meetingActionItems.meetingId, m.id))
        .orderBy(meetingActionItems.createdAt)
    : [];
  const people = canWriteNotes ? await internalPeople(viewer) : [];

  const canEdit = viewer.isInternal && m.status === 'scheduled' && (m.organizerId === viewer.id || can(viewer, 'meetings.manage'));
  const form = canEdit ? await meetingFormData(viewer) : null;
  const end = new Date(m.startsAt.getTime() + m.durationMinutes * 60_000);
  const ist = (d: Date) => d.toLocaleString('en-CA', { timeZone: 'Asia/Kolkata', hour12: false });
  const reviewing = m.status === 'requested' && can(viewer, 'meetings.manage');
  const review = reviewing
    ? await Promise.all([internalPeople(viewer), m.clientId ? clientPeople(viewer, m.clientId) : Promise.resolve([]), getGoogleAccount(viewer.id)])
    : null;
  const invited = new Set(attendees.map((a) => a.id));

  return (
    <>
      <Link href="/portal/meetings" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand">
        <ArrowLeft className="h-3.5 w-3.5" /> All meetings
      </Link>
      <PageHeader
        eyebrow={row.clientName ?? 'Internal'}
        title={m.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={m.status} label={m.status === 'requested' ? 'Awaiting confirmation' : m.status === 'rejected' ? 'Declined' : undefined} />
            {m.provider === 'google_meet' && (
              <Badge tone="brand">
                <Video className="h-3 w-3" /> Google Meet
              </Badge>
            )}
          </span>
        }
        actions={
          <>
            {m.meetingLink && m.status === 'scheduled' && (
              <Button asChild variant="primary" className="h-10 rounded-lg px-4 text-sm">
                <a href={m.meetingLink} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4" /> Join meeting
                </a>
              </Button>
            )}
            {form && (
              <EditMeetingButton
                {...form}
                initial={{
                  id: m.id,
                  title: m.title,
                  clientId: m.clientId,
                  projectId: m.projectId,
                  date: ist(m.startsAt).slice(0, 10),
                  time: ist(m.startsAt).slice(12, 17),
                  durationMinutes: m.durationMinutes,
                  description: m.description,
                  agenda: m.agenda,
                  teamIds: attendees.filter((a) => a.role !== 'client').map((a) => a.id),
                  clientAttendeeIds: attendees.filter((a) => a.role === 'client').map((a) => a.id),
                  meetingLink: m.meetingLink,
                  provider: m.provider,
                }}
              />
            )}
            {canEdit && <CancelMeetingButton id={m.id} />}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {m.status === 'requested' && !reviewing && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">This meeting was requested and is waiting for Isha Technologies to confirm the time. You’ll be notified as soon as it’s confirmed.</p>
          )}
          {m.status === 'rejected' && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
              This request was declined.{m.reviewNote && <span className="mt-1 block font-medium">“{m.reviewNote}”</span>}
            </p>
          )}
          {review && (
            <Panel title="Review meeting request" description="Confirm the proposed time or change it, add participants, and choose how the meeting link is created.">
              <ReviewMeetingRequestForm
                id={m.id}
                date={ist(m.startsAt).slice(0, 10)}
                time={ist(m.startsAt).slice(12, 17)}
                durationMinutes={m.durationMinutes}
                googleEmail={review[2]?.googleEmail ?? null}
                candidates={[
                  ...review[0].filter((p) => !invited.has(p.id)).map((p) => ({ id: p.id, name: p.name, meta: p.title ?? 'Team' })),
                  ...review[1].filter((p) => !invited.has(p.id)).map((p) => ({ id: p.id, name: p.name, meta: p.company })),
                ]}
              />
            </Panel>
          )}
          <Panel>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{fmtDateTime(m.startsAt)}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" /> until {fmtTime(end)} IST · {m.durationMinutes} min
                  </p>
                </div>
              </div>
              {m.meetingLink && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Link</p>
                  <a href={m.meetingLink} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-brand hover:underline">
                    {m.meetingLink}
                  </a>
                </div>
              )}
            </div>
          </Panel>
          <Panel title="Agenda">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{m.agenda || 'No agenda yet.'}</p>
          </Panel>
          {showNotes && (
            <Panel title="Minutes & action items" description={viewer.isInternal ? (m.minutesVisibility === 'client' ? 'Shared with client attendees.' : 'Visible to the Isha team only.') : undefined}>
              <div className="space-y-6">
                {canWriteNotes ? (
                  <MinutesForm meetingId={m.id} minutes={m.minutes} visibility={m.minutesVisibility} hasClient={Boolean(m.clientId)} />
                ) : m.minutes ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{m.minutes}</p>
                ) : (
                  <p className="text-sm text-slate-500">No minutes recorded yet.</p>
                )}
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Action items</h3>
                  <ActionItems
                    meetingId={m.id}
                    viewerId={viewer.id}
                    canWrite={canWriteNotes}
                    canPromote={Boolean(m.projectId)}
                    people={people.map((p) => ({ id: p.id, name: p.name }))}
                    items={actionItems.map(({ i, assignee }) => ({ id: i.id, title: i.title, done: i.done, assignee, assigneeId: i.assigneeId, dueDate: i.dueDate, taskId: i.taskId }))}
                  />
                </div>
              </div>
            </Panel>
          )}
          {m.description && (
            <Panel title="Notes">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{m.description}</p>
            </Panel>
          )}
        </div>
        <div className="space-y-6">
          <Panel title="Details">
            <KeyValue
              items={[
                { label: 'Organiser', value: row.organizer },
                { label: 'Project', value: row.projectName && m.projectId ? <Link href={`/portal/projects/${m.projectId}`} className="text-brand hover:underline">{row.projectName}</Link> : null },
              ]}
            />
          </Panel>
          <Panel title="Attendees" description={`${attendees.length} invited`}>
            <ul className="space-y-2.5">
              {attendees.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <Avatar name={a.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{a.name}</span>
                    <span className="block truncate text-xs text-slate-500">{a.title ?? ''}</span>
                  </span>
                  <Badge tone={a.role === 'client' ? 'violet' : 'brand'}>{a.role === 'client' ? 'Client' : 'Isha'}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
