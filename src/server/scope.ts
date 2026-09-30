import 'server-only';
import { and, eq, exists, inArray, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  activities,
  calendarEvents,
  changeRequests,
  clientUsers,
  clients,
  documents,
  invoices,
  leads,
  leaveRequests,
  meetingAttendees,
  meetings,
  payments,
  projectMembers,
  projects,
  tasks,
  tickets,
  users,
} from '@/server/db/schema';
import { can, type Viewer } from '@/server/auth/viewer';

/**
 * ─── Row-level authorisation ────────────────────────────────────────────
 *
 * Every read in the portal composes one of these predicates into its SQL
 * WHERE clause. This is the single place that defines who can see what:
 *
 *   Super Admin / Admin  → governed by `*.view_all`-style permissions
 *   Employee             → only rows tied to projects they are a member of,
 *                          or things explicitly assigned to them
 *   Client               → only rows whose client_id is their own account,
 *                          and only client-visible rows (never internal
 *                          tasks, comments, documents or draft invoices)
 *
 * Rules fail closed: a client user with no account, or an unknown case,
 * yields `FALSE` and returns nothing. Client scoping never depends on the
 * editable permission table (see `can()`), so a misconfiguration in
 * Settings cannot leak one client's data to another.
 */

const FALSE = sql`false`;
const TRUE = sql`true`;

/** Project ids the viewer is a member of (team or client member). */
export function memberProjectIds(v: Viewer) {
  return db
    .select({ id: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, v.id));
}

function clientProjectIds(clientId: string) {
  return db.select({ id: projects.id }).from(projects).where(eq(projects.clientId, clientId));
}

export function clientScope(v: Viewer): SQL {
  if (can(v, 'clients.view')) return TRUE;
  if (!v.isInternal) return v.clientId ? eq(clients.id, v.clientId) : FALSE;
  return inArray(
    clients.id,
    db.select({ id: projects.clientId }).from(projects).where(inArray(projects.id, memberProjectIds(v)))
  );
}

export function projectScope(v: Viewer): SQL {
  if (can(v, 'projects.view_all')) return TRUE;
  if (!v.isInternal) return v.clientId ? eq(projects.clientId, v.clientId) : FALSE;
  return inArray(projects.id, memberProjectIds(v));
}

export function taskScope(v: Viewer): SQL {
  if (can(v, 'tasks.view_all')) return TRUE;
  if (!v.isInternal) {
    if (!v.clientId) return FALSE;
    return and(eq(tasks.visibility, 'client'), inArray(tasks.projectId, clientProjectIds(v.clientId)))!;
  }
  return or(eq(tasks.assigneeId, v.id), inArray(tasks.projectId, memberProjectIds(v)))!;
}

export function documentScope(v: Viewer): SQL {
  const live = isNull(documents.deletedAt);
  if (can(v, 'documents.view_all')) return live;
  if (!v.isInternal) {
    if (!v.clientId) return FALSE;
    return and(live, eq(documents.clientId, v.clientId), eq(documents.visibility, 'client'))!;
  }
  return and(
    live,
    or(
      eq(documents.uploadedBy, v.id),
      inArray(documents.projectId, memberProjectIds(v)),
      inArray(documents.taskId, db.select({ id: tasks.id }).from(tasks).where(eq(tasks.assigneeId, v.id)))
    )
  )!;
}

export function invoiceScope(v: Viewer): SQL {
  if (can(v, 'invoices.view')) return TRUE;
  if (!v.isInternal && v.clientId) {
    return and(eq(invoices.clientId, v.clientId), ne(invoices.status, 'draft'))!;
  }
  return FALSE;
}

export function paymentScope(v: Viewer): SQL {
  if (can(v, 'invoices.view')) return TRUE;
  if (!v.isInternal && v.clientId) return eq(payments.clientId, v.clientId);
  return FALSE;
}

export function ticketScope(v: Viewer): SQL {
  if (can(v, 'tickets.view_all')) return TRUE;
  if (!v.isInternal) return v.clientId ? eq(tickets.clientId, v.clientId) : FALSE;
  return or(eq(tickets.assigneeId, v.id), inArray(tickets.projectId, memberProjectIds(v)))!;
}

export function meetingScope(v: Viewer): SQL {
  if (can(v, 'meetings.view_all')) return TRUE;
  const isAttendee = exists(
    db
      .select({ one: sql`1` })
      .from(meetingAttendees)
      .where(and(eq(meetingAttendees.meetingId, meetings.id), eq(meetingAttendees.userId, v.id)))
  );
  if (!v.isInternal) {
    if (!v.clientId) return FALSE;
    // Client users see their own account's meetings they're invited to;
    // the account owner sees all of their account's meetings.
    return v.clientRole === 'owner'
      ? eq(meetings.clientId, v.clientId)
      : and(eq(meetings.clientId, v.clientId), isAttendee)!;
  }
  return or(isAttendee, eq(meetings.organizerId, v.id), inArray(meetings.projectId, memberProjectIds(v)))!;
}

export function activityScope(v: Viewer): SQL {
  if (can(v, 'projects.view_all') && can(v, 'clients.view')) return TRUE;
  if (!v.isInternal) {
    if (!v.clientId) return FALSE;
    return and(eq(activities.clientId, v.clientId), eq(activities.visibility, 'client'))!;
  }
  return or(inArray(activities.projectId, memberProjectIds(v)), eq(activities.actorId, v.id))!;
}

export function leadScope(v: Viewer): SQL {
  if (can(v, 'leads.view')) return TRUE;
  if (v.isInternal) return eq(leads.assignedTo, v.id);
  return FALSE;
}

export function changeRequestScope(v: Viewer): SQL {
  if (can(v, 'change_requests.review')) return TRUE;
  if (!v.isInternal && v.clientId) return eq(changeRequests.clientId, v.clientId);
  return FALSE;
}

export function leaveScope(v: Viewer): SQL {
  if (can(v, 'leave.review')) return TRUE;
  if (v.isInternal) return eq(leaveRequests.userId, v.id);
  return FALSE;
}

export function calendarEventScope(v: Viewer): SQL {
  return v.isInternal
    ? inArray(calendarEvents.audience, ['all', 'employees'])
    : inArray(calendarEvents.audience, ['all', 'clients']);
}

/**
 * People the viewer may see in directories, pickers and profiles.
 * Clients see only their own colleagues and the team on their projects —
 * never another client's users.
 */
export function userScope(v: Viewer): SQL {
  if (v.isInternal) {
    const seesTeam = can(v, 'team.view');
    const seesClients = can(v, 'clients.view');
    if (seesTeam && seesClients) return TRUE;
    const coMembers = inArray(
      users.id,
      db.select({ id: projectMembers.userId }).from(projectMembers).where(inArray(projectMembers.projectId, memberProjectIds(v)))
    );
    return or(eq(users.id, v.id), seesTeam ? ne(users.role, 'client') : FALSE, seesClients ? eq(users.role, 'client') : coMembers)!;
  }
  if (!v.clientId) return eq(users.id, v.id);
  return or(
    inArray(users.id, db.select({ id: clientUsers.userId }).from(clientUsers).where(eq(clientUsers.clientId, v.clientId))),
    inArray(
      users.id,
      db
        .select({ id: projectMembers.userId })
        .from(projectMembers)
        .where(
          and(eq(projectMembers.memberType, 'team'), inArray(projectMembers.projectId, clientProjectIds(v.clientId)))
        )
    )
  )!;
}

// ─── Point checks for mutations ──────────────────────────────────────────

export async function isProjectMember(v: Viewer, projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ one: sql`1` })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, v.id)))
    .limit(1);
  return Boolean(row);
}

/** Returns the project if visible to the viewer, else null. */
export async function findVisibleProject(v: Viewer, projectId: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), projectScope(v)))
    .limit(1);
  return row ?? null;
}

export async function findVisibleTask(v: Viewer, taskId: string) {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), taskScope(v)))
    .limit(1);
  return row ?? null;
}

/** Can the viewer change this task (status, checklist, fields)? */
export async function canEditTask(v: Viewer, task: typeof tasks.$inferSelect): Promise<boolean> {
  if (!v.isInternal) return false;
  if (can(v, 'tasks.manage')) return true;
  return task.assigneeId === v.id || (await isProjectMember(v, task.projectId));
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
