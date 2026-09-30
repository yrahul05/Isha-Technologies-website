import 'server-only';
import { and, asc, count, desc, eq, gte, inArray, lt, lte, ne, notInArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  activities,
  clients,
  documents,
  employees,
  invoices,
  leads,
  leaveRequests,
  meetings,
  notifications,
  payments,
  projects,
  tasks,
  tickets,
  users,
} from '@/server/db/schema';
import { can, type Viewer } from '@/server/auth/viewer';
import {
  activityScope,
  clientScope,
  documentScope,
  invoiceScope,
  leadScope,
  meetingScope,
  paymentScope,
  projectScope,
  taskScope,
  ticketScope,
} from '@/server/scope';
import { todayIST } from '@/lib/portal/format';
import { projectProgress, projectTeams } from './common';

const OPEN_TICKET = ['open', 'in_progress', 'waiting_for_client'] as const;
const LIVE_PROJECT = ['planning', 'active', 'on_hold', 'at_risk'] as const;
const BILLABLE = ['sent', 'partially_paid', 'overdue'] as const;

async function recentActivity(v: Viewer, limit = 8) {
  return db
    .select({ id: activities.id, summary: activities.summary, createdAt: activities.createdAt, actor: users.name, entityType: activities.entityType, entityId: activities.entityId })
    .from(activities)
    .leftJoin(users, eq(users.id, activities.actorId))
    .where(activityScope(v))
    .orderBy(desc(activities.createdAt))
    .limit(limit);
}

async function myNotifications(v: Viewer, limit = 5) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, v.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

async function upcomingMeetings(v: Viewer, days = 14, limit = 5) {
  const now = new Date();
  return db
    .select({ id: meetings.id, title: meetings.title, startsAt: meetings.startsAt, durationMinutes: meetings.durationMinutes, meetingLink: meetings.meetingLink, clientName: clients.companyName, provider: meetings.provider })
    .from(meetings)
    .leftJoin(clients, eq(clients.id, meetings.clientId))
    .where(and(meetingScope(v), eq(meetings.status, 'scheduled'), gte(meetings.startsAt, new Date(now.getTime() - 60 * 60 * 1000)), lte(meetings.startsAt, new Date(now.getTime() + days * 86_400_000))))
    .orderBy(asc(meetings.startsAt))
    .limit(limit);
}

async function projectCards(v: Viewer, statuses: readonly string[], limit = 6) {
  const rows = await db
    .select({ id: projects.id, name: projects.name, code: projects.code, status: projects.status, health: projects.health, dueDate: projects.dueDate, clientName: clients.companyName })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(and(projectScope(v), inArray(projects.status, statuses as (typeof projects.status.enumValues)[number][])))
    .orderBy(asc(projects.dueDate))
    .limit(limit);
  const ids = rows.map((r) => r.id);
  const [progress, teams] = await Promise.all([projectProgress(ids), projectTeams(ids)]);
  return rows.map((r) => ({ ...r, progress: progress.get(r.id)!, team: (teams.get(r.id) ?? []).filter((m) => m.type === 'team').map((m) => m.name) }));
}

async function upcomingDeadlines(v: Viewer, onlyMine: boolean, days = 14, limit = 8) {
  const today = todayIST();
  const until = todayIST(days);
  const taskRows = await db
    .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate, status: tasks.status, priority: tasks.priority, project: projects.name })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(taskScope(v), ne(tasks.status, 'completed'), lte(tasks.dueDate, until), onlyMine ? eq(tasks.assigneeId, v.id) : undefined))
    .orderBy(asc(tasks.dueDate))
    .limit(limit);
  return taskRows.map((t) => ({ ...t, overdue: Boolean(t.dueDate && t.dueDate < today) }));
}

function monthKeys(n: number): { key: string; label: string; sublabel: string }[] {
  const out = [];
  const now = new Date(Date.now() + 5.5 * 3_600_000);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' }),
      sublabel: d.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    });
  }
  return out;
}

export async function getExecutiveDashboard(v: Viewer) {
  const today = todayIST();
  const finance = can(v, 'invoices.view');
  const months = monthKeys(6);

  const [
    [clientCount],
    projectCounts,
    [taskCounts],
    [openTickets],
    [pendingLeads],
    projectsLive,
    meetingsSoon,
    deadlines,
    activity,
    notes,
  ] = await Promise.all([
    db.select({ n: count() }).from(clients).where(and(clientScope(v), ne(clients.status, 'inactive'))),
    db.select({ status: projects.status, n: count() }).from(projects).where(projectScope(v)).groupBy(projects.status),
    db
      .select({
        pending: sql<number>`count(*) filter (where ${tasks.status} <> 'completed')::int`,
        overdue: sql<number>`count(*) filter (where ${tasks.status} <> 'completed' and ${tasks.dueDate} < ${today})::int`,
        blocked: sql<number>`count(*) filter (where ${tasks.status} = 'blocked')::int`,
        review: sql<number>`count(*) filter (where ${tasks.status} = 'review')::int`,
      })
      .from(tasks)
      .where(taskScope(v)),
    db.select({ n: count() }).from(tickets).where(and(ticketScope(v), inArray(tickets.status, [...OPEN_TICKET]))),
    db.select({ n: count() }).from(leads).where(and(leadScope(v), notInArray(leads.status, ['won', 'lost']))),
    projectCards(v, LIVE_PROJECT, 6),
    upcomingMeetings(v),
    upcomingDeadlines(v, false),
    recentActivity(v),
    myNotifications(v),
  ]);

  let financeData = null;
  if (finance) {
    const since = `${months[0].key}-01`;
    const [[out], [collected], monthly, [overdueInv]] = await Promise.all([
      db
        .select({ n: count(), amount: sql<number>`coalesce(sum(${invoices.totalPaise} - ${invoices.paidPaise}), 0)::bigint` })
        .from(invoices)
        .where(and(invoiceScope(v), inArray(invoices.status, [...BILLABLE]), sql`${invoices.paidPaise} < ${invoices.totalPaise}`)),
      db.select({ amount: sql<number>`coalesce(sum(${payments.amountPaise}), 0)::bigint` }).from(payments).where(paymentScope(v)),
      db
        .select({ month: sql<string>`to_char(${payments.paidOn}::date, 'YYYY-MM')`, amount: sql<number>`sum(${payments.amountPaise})::bigint` })
        .from(payments)
        .where(and(paymentScope(v), gte(payments.paidOn, since)))
        .groupBy(sql`1`),
      db
        .select({ n: count(), amount: sql<number>`coalesce(sum(${invoices.totalPaise} - ${invoices.paidPaise}), 0)::bigint` })
        .from(invoices)
        .where(and(invoiceScope(v), inArray(invoices.status, [...BILLABLE]), lt(invoices.dueDate, today), sql`${invoices.paidPaise} < ${invoices.totalPaise}`)),
    ]);
    const byMonth = new Map(monthly.map((m) => [m.month, Number(m.amount)]));
    financeData = {
      outstandingCount: out?.n ?? 0,
      outstandingPaise: Number(out?.amount ?? 0),
      overdueCount: overdueInv?.n ?? 0,
      overduePaise: Number(overdueInv?.amount ?? 0),
      totalCollectedPaise: Number(collected?.amount ?? 0),
      monthly: months.map((m) => ({ label: m.label, sublabel: m.sublabel, value: byMonth.get(m.key) ?? 0 })),
    };
  }

  const team = can(v, 'team.view')
    ? await db
        .select({
          id: users.id,
          name: users.name,
          title: users.title,
          availability: employees.availability,
          onLeave: sql<boolean>`exists (select 1 from ${leaveRequests} lr where lr.user_id = ${users.id} and lr.status = 'approved' and lr.start_date <= ${today} and lr.end_date >= ${today})`,
          openTasks: sql<number>`(select count(*)::int from ${tasks} t where t.assignee_id = ${users.id} and t.status <> 'completed')`,
        })
        .from(users)
        .leftJoin(employees, eq(employees.userId, users.id))
        .where(and(ne(users.role, 'client'), eq(users.isActive, true)))
        .orderBy(asc(users.name))
    : [];

  const counts = Object.fromEntries(projectCounts.map((p) => [p.status, p.n])) as Record<string, number>;
  return {
    clients: clientCount?.n ?? 0,
    projects: {
      active: (counts.active ?? 0) + (counts.at_risk ?? 0) + (counts.planning ?? 0) + (counts.on_hold ?? 0),
      completed: counts.completed ?? 0,
      atRisk: counts.at_risk ?? 0,
      byStatus: counts,
    },
    tasks: taskCounts ?? { pending: 0, overdue: 0, blocked: 0, review: 0 },
    openTickets: openTickets?.n ?? 0,
    openLeads: pendingLeads?.n ?? 0,
    projectsLive,
    meetingsSoon,
    deadlines,
    activity,
    notes,
    finance: financeData,
    team,
  };
}

export async function getEmployeeDashboard(v: Viewer) {
  const today = todayIST();
  const [myProjects, myTasks, deadlines, meetingsSoon, notes, docs, reviews, leave, announcements] = await Promise.all([
    projectCards(v, LIVE_PROJECT, 6),
    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority, dueDate: tasks.dueDate, project: projects.name })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(tasks.assigneeId, v.id), ne(tasks.status, 'completed')))
      .orderBy(asc(tasks.dueDate))
      .limit(50),
    upcomingDeadlines(v, true),
    upcomingMeetings(v),
    myNotifications(v, 6),
    db
      .select({ id: documents.id, name: documents.name, updatedAt: documents.updatedAt, project: projects.name })
      .from(documents)
      .leftJoin(projects, eq(projects.id, documents.projectId))
      .where(documentScope(v))
      .orderBy(desc(documents.updatedAt))
      .limit(5),
    db
      .select({ id: tasks.id, title: tasks.title, project: projects.name, assignee: users.name })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .leftJoin(users, eq(users.id, tasks.assigneeId))
      .where(and(taskScope(v), eq(tasks.status, 'review')))
      .limit(6),
    db.select().from(leaveRequests).where(eq(leaveRequests.userId, v.id)).orderBy(desc(leaveRequests.startDate)).limit(3),
    db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, v.id), sql`${notifications.type} like 'announcement%'`))
      .orderBy(desc(notifications.createdAt))
      .limit(3),
  ]);
  const todays = myTasks.filter((t) => t.status === 'in_progress' || (t.dueDate && t.dueDate <= today));
  return { myProjects, myTasks, todays, deadlines, meetingsSoon, notes, docs, reviews, leave, announcements };
}

export async function getClientDashboard(v: Viewer) {
  const today = todayIST();
  const [projectsLive, completedProjects, pendingTasks, activity, ticketsOpen, meetingsSoon, docs, invoiceRows, notes] = await Promise.all([
    projectCards(v, LIVE_PROJECT, 6),
    db.select({ n: count() }).from(projects).where(and(projectScope(v), eq(projects.status, 'completed'))),
    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate, project: projects.name })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(taskScope(v), ne(tasks.status, 'completed')))
      .orderBy(asc(tasks.dueDate))
      .limit(6),
    recentActivity(v, 8),
    db
      .select({ id: tickets.id, number: tickets.number, subject: tickets.subject, status: tickets.status, priority: tickets.priority, updated: tickets.lastActivityAt })
      .from(tickets)
      .where(and(ticketScope(v), inArray(tickets.status, [...OPEN_TICKET])))
      .orderBy(desc(tickets.lastActivityAt))
      .limit(5),
    upcomingMeetings(v),
    db
      .select({ id: documents.id, name: documents.name, updatedAt: documents.updatedAt, project: projects.name })
      .from(documents)
      .leftJoin(projects, eq(projects.id, documents.projectId))
      .where(documentScope(v))
      .orderBy(desc(documents.updatedAt))
      .limit(5),
    db
      .select({ id: invoices.id, number: invoices.number, status: invoices.status, totalPaise: invoices.totalPaise, paidPaise: invoices.paidPaise, dueDate: invoices.dueDate, issueDate: invoices.issueDate })
      .from(invoices)
      .where(and(invoiceScope(v), ne(invoices.status, 'cancelled')))
      .orderBy(desc(invoices.issueDate)),
    myNotifications(v, 5),
  ]);
  const outstanding = invoiceRows.filter((i) => i.paidPaise < i.totalPaise);
  return {
    projectsLive,
    completedProjects: completedProjects[0]?.n ?? 0,
    pendingTasks,
    activity,
    ticketsOpen,
    meetingsSoon,
    docs,
    notes,
    invoices: {
      outstanding: outstanding.slice(0, 5),
      outstandingCount: outstanding.length,
      duePaise: outstanding.reduce((s, i) => s + i.totalPaise - i.paidPaise, 0),
      overduePaise: outstanding.filter((i) => i.dueDate < today).reduce((s, i) => s + i.totalPaise - i.paidPaise, 0),
      paidCount: invoiceRows.filter((i) => i.totalPaise > 0 && i.paidPaise >= i.totalPaise).length,
      lifetimeBilledPaise: invoiceRows.reduce((s, i) => s + i.totalPaise, 0),
      lifetimePaidPaise: invoiceRows.reduce((s, i) => s + i.paidPaise, 0),
    },
  };
}

