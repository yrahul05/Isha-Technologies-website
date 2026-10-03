'use server';

import { randomUUID } from 'node:crypto';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { calendarEvents, clientUsers, meetingAttendees, meetings, projects, users } from '@/server/db/schema';
import { assertCan, can, ForbiddenError, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { isProjectMember, meetingScope } from '@/server/scope';
import { cancelMeetEvent, createMeetEvent, disconnectGoogleAccount, getGoogleAccount, updateMeetEvent } from '@/server/google';
import { audit, recordActivity } from '@/server/audit';
import { usersWithPermission } from '@/server/notify';
import { notifyMeeting } from '@/server/meetings';
import { userScope } from '@/server/scope';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const ids = z.preprocess((v) => (v === undefined || v === '' ? [] : Array.isArray(v) ? v : [v]), z.array(z.uuid()).max(100));
const optUuid = z
  .union([z.literal(''), z.uuid()])
  .optional()
  .transform((v) => v || null);

const meetingSchema = z.object({
  id: optUuid,
  title: z.string().trim().min(3, 'Add a meeting title.').max(200),
  clientId: optUuid,
  projectId: optUuid,
  date: z.iso.date('Choose a date.'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time.'),
  durationMinutes: z.coerce.number().int().min(10).max(480),
  description: z.string().trim().max(4000).default(''),
  agenda: z.string().trim().max(4000).default(''),
  teamIds: ids,
  clientAttendeeIds: ids,
  mode: z.enum(['google_meet', 'manual']).default('manual'),
  meetingLink: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null)
    .refine((v) => !v || /^https:\/\//.test(v), 'Meeting links must start with https://'),
});

type Input = z.infer<typeof meetingSchema>;

/** IST wall-clock → UTC instant. */
function startsAt(d: Input): Date {
  return new Date(`${d.date}T${d.time}:00+05:30`);
}

/**
 * Attendee validation: team members must be active internal users; client
 * attendees must belong to the meeting's client. Returns user ids + emails.
 */
async function resolveAttendees(viewer: Viewer, d: Input) {
  if (d.projectId) {
    const [p] = await db.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, d.projectId));
    if (!p) throw new ForbiddenError('Project not found.');
    if (d.clientId && d.clientId !== p.clientId) return { error: { fieldErrors: { projectId: 'That project belongs to a different client.' } } as ActionState };
    d.clientId = p.clientId;
    if (!can(viewer, 'meetings.manage') && !(await isProjectMember(viewer, d.projectId))) throw new ForbiddenError('You can only schedule meetings for your projects.');
  } else if (d.clientId && !can(viewer, 'meetings.manage')) {
    throw new ForbiddenError('Only meeting managers can schedule client meetings outside a project.');
  }
  const team = d.teamIds.length
    ? await db.select({ id: users.id, email: users.email }).from(users).where(and(inArray(users.id, d.teamIds), ne(users.role, 'client'), eq(users.isActive, true)))
    : [];
  const clientPeople =
    d.clientAttendeeIds.length && d.clientId
      ? await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .innerJoin(clientUsers, eq(clientUsers.userId, users.id))
          .where(and(inArray(users.id, d.clientAttendeeIds), eq(clientUsers.clientId, d.clientId), eq(users.isActive, true)))
      : [];
  if (clientPeople.length !== d.clientAttendeeIds.length) return { error: { fieldErrors: { clientAttendeeIds: 'Client attendees must belong to the selected client.' } } as ActionState };
  const all = [{ id: viewer.id, email: viewer.email }, ...team, ...clientPeople];
  const unique = [...new Map(all.map((a) => [a.id, a])).values()];
  return { attendees: unique };
}

export async function saveMeetingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let saved: string | undefined;
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!viewer.isInternal) throw new ForbiddenError();
    const parsed = parseForm(meetingSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const start = startsAt(d);
    if (!d.id && start.getTime() < Date.now() - 5 * 60_000) return { fieldErrors: { date: 'That time is in the past.' } };

    const resolved = await resolveAttendees(viewer, d);
    if ('error' in resolved) return resolved.error!;
    const { attendees } = resolved;

    let existing: typeof meetings.$inferSelect | undefined;
    if (d.id) {
      [existing] = await db.select().from(meetings).where(and(eq(meetings.id, d.id), meetingScope(viewer)));
      if (!existing) throw new ForbiddenError();
      if (existing.organizerId !== viewer.id && !can(viewer, 'meetings.manage')) throw new ForbiddenError('Only the organiser can change this meeting.');
      if (existing.status !== 'scheduled') return { error: 'Only scheduled meetings can be edited here. Review meeting requests from the Meetings page.' };
    }

    let meetingLink = d.meetingLink;
    let googleEventId = existing?.googleEventId ?? null;
    let provider: 'google_meet' | 'manual' = existing?.provider ?? d.mode;
    const calendarInput = {
      requestId: randomUUID(),
      summary: d.title,
      description: [d.description, d.agenda && `Agenda:\n${d.agenda}`, 'Scheduled via the Isha Technologies portal.'].filter(Boolean).join('\n\n'),
      start,
      durationMinutes: d.durationMinutes,
      attendees: attendees.map((a) => a.email),
    };

    try {
      if (!existing && d.mode === 'google_meet') {
        if (!(await getGoogleAccount(viewer.id))) return { error: 'Connect your Google account first (Settings → Google Calendar), or add a meeting link manually.' };
        const ev = await createMeetEvent(viewer.id, calendarInput);
        googleEventId = ev.eventId;
        meetingLink = ev.meetLink;
        provider = 'google_meet';
      } else if (existing?.googleEventId && existing.organizerId) {
        await updateMeetEvent(existing.organizerId, existing.googleEventId, calendarInput);
        meetingLink = existing.meetingLink;
      }
    } catch (error) {
      console.error('Google Calendar sync failed', error instanceof Error ? error.message : error);
      return { error: 'Google Calendar rejected the request. Reconnect Google in Settings and try again.' };
    }

    const values = {
      title: d.title,
      description: d.description,
      agenda: d.agenda,
      clientId: d.clientId,
      projectId: d.projectId,
      startsAt: start,
      durationMinutes: d.durationMinutes,
      meetingLink,
      provider,
      googleEventId,
    };
    let id = existing?.id;
    if (existing) {
      await db.update(meetings).set(values).where(eq(meetings.id, existing.id));
      await db.delete(meetingAttendees).where(eq(meetingAttendees.meetingId, existing.id));
    } else {
      const [row] = await db.insert(meetings).values({ ...values, organizerId: viewer.id }).returning({ id: meetings.id });
      id = row.id;
    }
    await db.insert(meetingAttendees).values(attendees.map((a) => ({ meetingId: id!, userId: a.id })));

    const when = start.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
    await audit(viewer, existing ? 'meeting.updated' : 'meeting.scheduled', { entityType: 'meeting', entityId: id!, metadata: { provider, attendees: attendees.length } });
    if (d.clientId) await recordActivity({ entityType: 'meeting', entityId: id!, clientId: d.clientId, projectId: d.projectId, actorId: viewer.id, summary: `${existing ? 'Rescheduled' : 'Scheduled'} “${d.title}” for ${when}`, visibility: 'client' });
    const rescheduled = Boolean(existing && (existing.startsAt.getTime() !== start.getTime() || existing.durationMinutes !== d.durationMinutes));
    await notifyMeeting(id!, existing ? (rescheduled ? 'rescheduled' : 'updated') : 'scheduled', viewer.id);
    saved = id;
    revalidatePath('/portal/meetings');
    revalidatePath('/portal/calendar');
    return { ok: true };
  });
  if (saved) redirect(`/portal/meetings/${saved}`);
  return result;
}

export async function cancelMeetingAction(id: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const [m] = await db.select().from(meetings).where(and(eq(meetings.id, id), meetingScope(viewer)));
    if (!m || (m.organizerId !== viewer.id && !can(viewer, 'meetings.manage'))) throw new ForbiddenError();
    if (m.googleEventId && m.organizerId) await cancelMeetEvent(m.organizerId, m.googleEventId).catch((e) => console.error('Google cancel failed', e));
    await db.update(meetings).set({ status: 'cancelled' }).where(eq(meetings.id, id));
    await notifyMeeting(id, 'cancelled', viewer.id);
    await audit(viewer, 'meeting.cancelled', { entityType: 'meeting', entityId: id });
    if (m.clientId) await recordActivity({ entityType: 'meeting', entityId: id, clientId: m.clientId, projectId: m.projectId, actorId: viewer.id, summary: `Cancelled “${m.title}”`, visibility: 'client' });
    revalidatePath('/portal/meetings');
    revalidatePath(`/portal/meetings/${id}`);
    return { ok: true, message: 'Meeting cancelled and attendees notified.' };
  });
}

export async function disconnectGoogleAction(): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    await disconnectGoogleAccount(viewer.id);
    await audit(viewer, 'google.disconnected', { entityType: 'user', entityId: viewer.id });
    revalidatePath('/portal/settings');
    return { ok: true, message: 'Google account disconnected.' };
  });
}

const eventSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    type: z.enum(['holiday', 'event', 'deadline']),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
    audience: z.enum(['all', 'employees', 'clients']),
    description: z.string().trim().max(1000).default(''),
  })
  .refine((d) => d.endsOn >= d.startsOn, { path: ['endsOn'], message: 'End must be on or after start.' });

export async function createCalendarEventAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'calendar.manage');
    const parsed = parseForm(eventSchema, form);
    if (parsed.error) return parsed.error;
    await db.insert(calendarEvents).values({ ...parsed.data, createdBy: viewer.id });
    revalidatePath('/portal/calendar');
    return { ok: true, message: 'Added to the calendar.' };
  });
}

// ─── Client meeting requests → reviewed by meeting managers ───────────────
const requestSchema = z.object({
  title: z.string().trim().min(3, 'Add a meeting title.').max(200),
  projectId: optUuid,
  date: z.iso.date('Choose a date.'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time.'),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  agenda: z.string().trim().max(4000).default(''),
  participantIds: ids,
});

/**
 * A client asks for a meeting and proposes a time and participants. The
 * participants must be people the client is allowed to see (their own
 * colleagues and the team on their projects), enforced with userScope.
 * Nothing is booked until an Admin/Super Admin approves it.
 */
export async function requestMeetingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let created: string | undefined;
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (viewer.isInternal || !viewer.clientId) throw new ForbiddenError('Meeting requests are made from a client account.');
    const parsed = parseForm(requestSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const start = new Date(`${d.date}T${d.time}:00+05:30`);
    if (start.getTime() < Date.now()) return { fieldErrors: { date: 'Choose a time in the future.' } };
    if (d.projectId) {
      const [p] = await db.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, d.projectId));
      if (!p || p.clientId !== viewer.clientId) throw new ForbiddenError();
    }
    const allowed = d.participantIds.length
      ? await db.select({ id: users.id }).from(users).where(and(inArray(users.id, d.participantIds), eq(users.isActive, true), userScope(viewer)))
      : [];
    if (allowed.length !== d.participantIds.length) return { fieldErrors: { participantIds: 'You can only invite your colleagues and your project team.' } };

    const [m] = await db
      .insert(meetings)
      .values({ title: d.title, agenda: d.agenda, clientId: viewer.clientId, projectId: d.projectId, startsAt: start, durationMinutes: d.durationMinutes, status: 'requested', requestedBy: viewer.id })
      .returning({ id: meetings.id });
    const attendeeIds = [...new Set([viewer.id, ...allowed.map((a) => a.id)])];
    await db.insert(meetingAttendees).values(attendeeIds.map((userId) => ({ meetingId: m.id, userId })));
    await audit(viewer, 'meeting.requested', { entityType: 'meeting', entityId: m.id, metadata: { participants: attendeeIds.length } });
    await recordActivity({ entityType: 'meeting', entityId: m.id, clientId: viewer.clientId, projectId: d.projectId, actorId: viewer.id, summary: `Meeting requested: “${d.title}”`, visibility: 'client' });
    await notifyMeeting(m.id, 'requested', viewer.id, await usersWithPermission('meetings.manage'));
    created = m.id;
    revalidatePath('/portal/meetings');
    return { ok: true };
  });
  if (created) redirect(`/portal/meetings/${created}`);
  return result;
}

const reviewSchema = z.object({
  id: z.uuid(),
  decision: z.enum(['approved', 'rejected']),
  date: z.iso.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().min(10).max(480),
  addParticipantIds: ids,
  mode: z.enum(['google_meet', 'manual']).default('manual'),
  meetingLink: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null)
    .refine((v) => !v || /^https:\/\//.test(v), 'Meeting links must start with https://'),
  note: z.string().trim().max(1000).optional().transform((v) => v || null),
});

/**
 * Approve (optionally rescheduling and adding Admins, employees or more of
 * the client's people), or reject with a note. Approval can create the
 * Google Calendar event + Meet link from the approver's Google account.
 */
export async function reviewMeetingRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'meetings.manage');
    const parsed = parseForm(reviewSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    const [m] = await db.select().from(meetings).where(eq(meetings.id, d.id));
    if (!m || m.status !== 'requested') return { error: 'This request has already been handled.' };

    if (d.decision === 'rejected') {
      if (!d.note) return { fieldErrors: { note: 'Add a short note for the client.' } };
      await db.update(meetings).set({ status: 'rejected', reviewNote: d.note }).where(eq(meetings.id, m.id));
      await audit(viewer, 'meeting.request_rejected', { entityType: 'meeting', entityId: m.id, metadata: { note: d.note } });
      if (m.clientId) await recordActivity({ entityType: 'meeting', entityId: m.id, clientId: m.clientId, actorId: viewer.id, summary: `Meeting request declined: “${m.title}”`, visibility: 'client' });
      await notifyMeeting(m.id, 'rejected', viewer.id, [m.requestedBy]);
      revalidatePath(`/portal/meetings/${m.id}`);
      return { ok: true, message: 'Request declined and the client notified.' };
    }

    // Added participants: any active internal user, or users of THIS meeting's client only.
    if (d.addParticipantIds.length) {
      const rows = await db
        .select({ id: users.id, role: users.role, clientId: clientUsers.clientId })
        .from(users)
        .leftJoin(clientUsers, eq(clientUsers.userId, users.id))
        .where(and(inArray(users.id, d.addParticipantIds), eq(users.isActive, true)));
      if (rows.length !== d.addParticipantIds.length || rows.some((r) => r.role === 'client' && r.clientId !== m.clientId)) {
        return { fieldErrors: { addParticipantIds: 'Participants must be team members or people from this client.' } };
      }
    }
    const start = new Date(`${d.date}T${d.time}:00+05:30`);
    const existing = await db.select({ id: meetingAttendees.userId }).from(meetingAttendees).where(eq(meetingAttendees.meetingId, m.id));
    const attendeeIds = [...new Set([...existing.map((e) => e.id), ...d.addParticipantIds, viewer.id])];
    const emails = await db.select({ email: users.email }).from(users).where(inArray(users.id, attendeeIds));

    let meetingLink = d.meetingLink;
    let googleEventId: string | null = null;
    let provider: 'google_meet' | 'manual' = 'manual';
    if (d.mode === 'google_meet') {
      if (!(await getGoogleAccount(viewer.id))) return { error: 'Connect your Google account in Settings → Google Calendar, or add a link manually.' };
      try {
        const ev = await createMeetEvent(viewer.id, {
          requestId: randomUUID(),
          summary: m.title,
          description: [m.agenda && `Agenda:\n${m.agenda}`, 'Scheduled via the Isha Technologies portal.'].filter(Boolean).join('\n\n'),
          start,
          durationMinutes: d.durationMinutes,
          attendees: emails.map((e) => e.email),
        });
        meetingLink = ev.meetLink;
        googleEventId = ev.eventId;
        provider = 'google_meet';
      } catch (error) {
        console.error('Google Calendar create failed', error instanceof Error ? error.message : error);
        return { error: 'Google Calendar rejected the request. Reconnect Google in Settings and try again.' };
      }
    }
    await db
      .update(meetings)
      .set({ status: 'scheduled', organizerId: viewer.id, startsAt: start, durationMinutes: d.durationMinutes, meetingLink, googleEventId, provider, reviewNote: d.note })
      .where(eq(meetings.id, m.id));
    const toAdd = attendeeIds.filter((uid) => !existing.some((e) => e.id === uid));
    if (toAdd.length) await db.insert(meetingAttendees).values(toAdd.map((userId) => ({ meetingId: m.id, userId })));

    await audit(viewer, 'meeting.request_approved', { entityType: 'meeting', entityId: m.id, metadata: { rescheduled: start.getTime() !== m.startsAt.getTime(), addedParticipants: toAdd.length, provider } });
    if (m.clientId) await recordActivity({ entityType: 'meeting', entityId: m.id, clientId: m.clientId, projectId: m.projectId, actorId: viewer.id, summary: `Meeting confirmed: “${m.title}”`, visibility: 'client' });
    await notifyMeeting(m.id, 'approved', viewer.id, [m.requestedBy]);
    await notifyMeeting(m.id, 'scheduled', viewer.id, attendeeIds.filter((uid) => uid !== m.requestedBy));
    revalidatePath(`/portal/meetings/${m.id}`);
    revalidatePath('/portal/meetings');
    return { ok: true, message: 'Meeting confirmed and everyone notified.' };
  });
}
