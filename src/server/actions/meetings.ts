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
import { notifyUsers } from '@/server/notify';
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
    await notifyUsers(
      attendees.map((a) => a.id),
      { type: existing ? 'meeting.updated' : 'meeting.scheduled', title: existing ? `Meeting changed: ${d.title}` : `Meeting scheduled: ${d.title}`, body: `${when} · ${d.durationMinutes} min${meetingLink ? ' · Google Meet' : ''}`, link: `/portal/meetings/${id}`, priority: 'high' },
      { actorId: viewer.id }
    );
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
    const attendees = await db.select({ id: meetingAttendees.userId }).from(meetingAttendees).where(eq(meetingAttendees.meetingId, id));
    await notifyUsers(attendees.map((a) => a.id), { type: 'meeting.updated', title: `Meeting cancelled: ${m.title}`, body: m.startsAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }), link: `/portal/meetings/${id}`, priority: 'high' }, { actorId: viewer.id });
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
