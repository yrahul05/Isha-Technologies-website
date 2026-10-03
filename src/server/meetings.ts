import 'server-only';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import { meetingAttendees, meetings, projects, users } from '@/server/db/schema';
import { notifyUsers } from '@/server/notify';

export type MeetingEvent = 'scheduled' | 'updated' | 'rescheduled' | 'cancelled' | 'requested' | 'approved' | 'rejected';

const TITLES: Record<MeetingEvent, (t: string) => string> = {
  scheduled: (t) => `Meeting scheduled: ${t}`,
  updated: (t) => `Meeting updated: ${t}`,
  rescheduled: (t) => `Meeting rescheduled: ${t}`,
  cancelled: (t) => `Meeting cancelled: ${t}`,
  requested: (t) => `Meeting requested: ${t}`,
  approved: (t) => `Meeting request approved: ${t}`,
  rejected: (t) => `Meeting request declined: ${t}`,
};

/**
 * Sends the meeting notification to `recipients` (default: all attendees).
 * Each person sees the date and time in their own profile timezone, plus
 * organiser, participants, project and the Google Meet link.
 */
export async function notifyMeeting(meetingId: string, event: MeetingEvent, actorId: string | null, recipients?: (string | null | undefined)[]) {
  const [m] = await db
    .select({ m: meetings, projectName: projects.name, organizer: users.name })
    .from(meetings)
    .leftJoin(projects, eq(projects.id, meetings.projectId))
    .leftJoin(users, eq(users.id, meetings.organizerId))
    .where(eq(meetings.id, meetingId));
  if (!m) return;
  const people = await db
    .select({ id: users.id, name: users.name, timezone: users.timezone })
    .from(meetingAttendees)
    .innerJoin(users, eq(users.id, meetingAttendees.userId))
    .where(eq(meetingAttendees.meetingId, meetingId));
  const targets = recipients ? [...new Set(recipients.filter(Boolean) as string[])] : people.map((p) => p.id);
  if (!targets.length) return;
  const tzRows = await db.select({ id: users.id, timezone: users.timezone }).from(users).where(inArray(users.id, targets));

  // One notification per timezone group so every recipient sees local time.
  const byTz = new Map<string, string[]>();
  for (const r of tzRows) byTz.set(r.timezone, [...(byTz.get(r.timezone) ?? []), r.id]);
  const participants = people.map((p) => p.name).join(', ');
  const priority = event === 'rejected' || event === 'approved' ? 'high' : event === 'requested' ? 'high' : 'high';
  for (const [tz, ids] of byTz) {
    const date = m.m.startsAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: tz });
    const time = `${m.m.startsAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: tz })} (${tz.replace('_', ' ')}) · ${m.m.durationMinutes} min`;
    const body = [
      `${date}, ${time}`,
      m.organizer ? `Organiser: ${m.organizer}` : '',
      participants ? `Participants: ${participants}` : '',
      m.projectName ? `Project: ${m.projectName}` : '',
      m.m.meetingLink && event !== 'cancelled' && event !== 'rejected' ? `Google Meet: ${m.m.meetingLink}` : '',
      event === 'rejected' && m.m.reviewNote ? `Note: ${m.m.reviewNote}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    await notifyUsers(
      ids,
      {
        type: `meeting.${event}`,
        title: TITLES[event](m.m.title),
        body,
        link: `/portal/meetings/${meetingId}`,
        priority,
        details: [
          ['Date', date],
          ['Time', time],
          ['Organiser', m.organizer ?? 'To be confirmed'],
          ['Participants', participants],
          ['Project', m.projectName ?? ''],
          ['Google Meet', event !== 'cancelled' && event !== 'rejected' ? (m.m.meetingLink ?? '') : ''],
        ],
      },
      { actorId }
    );
  }
}
