import 'server-only';
import { and, asc, desc, eq, gte, inArray, lt, ne, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, contracts, invoices, meetings, projects, proposals, tasks, timeEntries } from '@/server/db/schema';
import { can, type Viewer } from '@/server/auth/viewer';
import { contractScope, invoiceScope, meetingScope, projectScope, proposalScope, taskScope, timeEntryScope } from '@/server/scope';
import { searchEverything } from '@/server/queries/search';
import { renewalCenter } from '@/server/queries/renewals';
import { projectProfitability } from '@/server/queries/profitability';
import { formatMoney } from '@/lib/portal/invoice-math';
import { todayIST } from '@/lib/portal/format';
import { addDays } from '@/lib/portal/time';

/**
 * Isha AI tools. The assistant is READ-ONLY and permission-aware by
 * construction:
 *   • every tool runs through the same scoped query predicates as the
 *     portal pages (src/server/scope.ts), bound to the signed-in viewer;
 *   • tools never accept a user, client or tenant id — the model cannot ask
 *     for someone else's data because there is no parameter to say so;
 *   • tools the viewer isn't permitted to use are not even offered;
 *   • results are capped and contain only display fields.
 */
type Tool = {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  allowed: (v: Viewer) => boolean;
  run: (v: Viewer, input: Record<string, unknown>) => Promise<unknown>;
};

const LIMIT = 25;
const str = (v: unknown, max = 80) => (typeof v === 'string' ? v.slice(0, max) : undefined);
const enumOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined);

export const TOOLS: Tool[] = [
  {
    name: 'search',
    description: 'Search everything the user can access (projects, tasks, documents, invoices, clients, tickets) by keyword.',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Keyword(s) to look for' } }, required: ['query'] },
    allowed: () => true,
    run: async (v, input) => (await searchEverything(v, str(input.query, 100) ?? '')).slice(0, LIMIT),
  },
  {
    name: 'list_projects',
    description: 'List projects the user can see, with status, health, client and due date.',
    input_schema: { type: 'object', properties: { status: { type: 'string', enum: ['planning', 'active', 'on_hold', 'at_risk', 'completed'] } } },
    allowed: () => true,
    run: async (v, input) => {
      const status = enumOf(input.status, ['planning', 'active', 'on_hold', 'at_risk', 'completed'] as const);
      const rows = await db
        .select({ code: projects.code, name: projects.name, status: projects.status, health: projects.health, due: projects.dueDate, client: clients.companyName })
        .from(projects)
        .innerJoin(clients, eq(clients.id, projects.clientId))
        .where(and(projectScope(v), ne(projects.status, 'cancelled'), status ? eq(projects.status, status) : undefined))
        .orderBy(asc(projects.name))
        .limit(LIMIT);
      return rows;
    },
  },
  {
    name: 'list_tasks',
    description: 'List tasks the user can see. Use overdue=true for tasks past their due date and not completed.',
    input_schema: { type: 'object', properties: { status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'completed', 'blocked'] }, overdue: { type: 'boolean' }, mine: { type: 'boolean', description: 'Only tasks assigned to the user' } } },
    allowed: () => true,
    run: async (v, input) => {
      const status = enumOf(input.status, ['todo', 'in_progress', 'review', 'completed', 'blocked'] as const);
      const today = todayIST();
      return db
        .select({ title: tasks.title, status: tasks.status, priority: tasks.priority, due: tasks.dueDate, project: projects.name })
        .from(tasks)
        .innerJoin(projects, eq(projects.id, tasks.projectId))
        .where(and(taskScope(v), status ? eq(tasks.status, status) : undefined, input.overdue ? and(lt(tasks.dueDate, today), ne(tasks.status, 'completed')) : undefined, input.mine ? eq(tasks.assigneeId, v.id) : undefined))
        .orderBy(asc(tasks.dueDate))
        .limit(LIMIT);
    },
  },
  {
    name: 'list_invoices',
    description: 'List invoices the user can see with number, status, currency, total and balance due.',
    input_schema: { type: 'object', properties: { status: { type: 'string', enum: ['sent', 'partially_paid', 'paid', 'overdue'] } } },
    allowed: (v) => can(v, 'invoices.view') || !v.isInternal,
    run: async (v, input) => {
      const status = enumOf(input.status, ['sent', 'partially_paid', 'paid', 'overdue'] as const);
      const rows = await db
        .select({ number: invoices.number, status: invoices.status, currency: invoices.currency, total: invoices.totalPaise, paid: invoices.paidPaise, due: invoices.dueDate, client: clients.companyName })
        .from(invoices)
        .innerJoin(clients, eq(clients.id, invoices.clientId))
        .where(and(invoiceScope(v), status ? eq(invoices.status, status) : undefined))
        .orderBy(desc(invoices.issueDate))
        .limit(LIMIT);
      return rows.map((r) => ({ number: r.number, status: r.status, client: r.client, total: formatMoney(r.total, r.currency), balanceDue: formatMoney(r.total - r.paid, r.currency), dueDate: r.due }));
    },
  },
  {
    name: 'list_meetings',
    description: 'List upcoming meetings the user can see (next 30 days).',
    input_schema: { type: 'object', properties: {} },
    allowed: () => true,
    run: async (v) => {
      const rows = await db
        .select({ title: meetings.title, startsAt: meetings.startsAt, minutes: meetings.durationMinutes, status: meetings.status, client: clients.companyName })
        .from(meetings)
        .leftJoin(clients, eq(clients.id, meetings.clientId))
        .where(and(meetingScope(v), gte(meetings.startsAt, new Date()), lt(meetings.startsAt, new Date(Date.now() + 30 * 86_400_000)), inArray(meetings.status, ['scheduled', 'requested'])))
        .orderBy(asc(meetings.startsAt))
        .limit(LIMIT);
      return rows.map((r) => ({ ...r, startsAt: r.startsAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST' }));
    },
  },
  {
    name: 'list_proposals',
    description: 'List proposals the user can see with status, value and validity.',
    input_schema: { type: 'object', properties: {} },
    allowed: (v) => can(v, 'proposals.view') || !v.isInternal,
    run: async (v) => {
      const rows = await db.select({ number: proposals.number, title: proposals.title, status: proposals.status, currency: proposals.currency, total: proposals.totalPaise, validUntil: proposals.validUntil }).from(proposals).where(proposalScope(v)).orderBy(desc(proposals.createdAt)).limit(LIMIT);
      return rows.map((r) => ({ number: r.number, title: r.title, status: r.status, total: formatMoney(r.total, r.currency), validUntil: r.validUntil }));
    },
  },
  {
    name: 'list_contracts',
    description: 'List contracts the user can see with status, end date and value.',
    input_schema: { type: 'object', properties: {} },
    allowed: (v) => can(v, 'contracts.view') || !v.isInternal,
    run: async (v) => {
      const rows = await db.select({ number: contracts.number, title: contracts.title, status: contracts.status, end: contracts.endDate, currency: contracts.currency, value: contracts.valuePaise }).from(contracts).where(contractScope(v)).orderBy(asc(contracts.endDate)).limit(LIMIT);
      return rows.map((r) => ({ number: r.number, title: r.title, status: r.status, endDate: r.end, value: r.value ? formatMoney(r.value, r.currency) : null }));
    },
  },
  {
    name: 'list_renewals',
    description: 'List upcoming renewals and expiries (domains, SSL, licences, contracts), soonest first.',
    input_schema: { type: 'object', properties: {} },
    allowed: (v) => v.isInternal && can(v, 'renewals.view'),
    run: async (v) => (await renewalCenter(v)).slice(0, LIMIT).map((r) => ({ name: r.name, kind: r.kind, client: r.client, expiresOn: r.expiresOn, daysLeft: r.daysLeft, cost: r.costPaise ? formatMoney(r.costPaise, r.currency) : null })),
  },
  {
    name: 'my_time_summary',
    description: 'Hours the user logged in the last 7 days, by project.',
    input_schema: { type: 'object', properties: {} },
    allowed: (v) => v.isInternal && can(v, 'time.log'),
    run: async (v) => {
      const rows = await db
        .select({ project: projects.name, minutes: sql<number>`sum(${timeEntries.minutes})::int` })
        .from(timeEntries)
        .innerJoin(projects, eq(projects.id, timeEntries.projectId))
        .where(and(timeEntryScope(v), eq(timeEntries.userId, v.id), gte(timeEntries.workDate, addDays(todayIST(), -7))))
        .groupBy(projects.name);
      return rows.map((r) => ({ project: r.project, hours: Math.round((r.minutes / 60) * 10) / 10 }));
    },
  },
  {
    name: 'project_profitability',
    description: 'Per-project revenue, time cost and margin (INR).',
    input_schema: { type: 'object', properties: {} },
    allowed: (v) => v.isInternal && can(v, 'time.view_all'),
    run: async (v) => (await projectProfitability(v)).slice(0, LIMIT).map((p) => ({ project: p.name, client: p.client, hours: p.hours, revenueINR: p.revenuePaise / 100, costINR: p.costPaise / 100, marginPct: p.marginPct })),
  },
];

export function toolsFor(viewer: Viewer) {
  return TOOLS.filter((t) => t.allowed(viewer));
}

export async function runTool(viewer: Viewer, name: string, input: Record<string, unknown>): Promise<{ content: string; isError: boolean }> {
  const tool = toolsFor(viewer).find((t) => t.name === name);
  if (!tool) return { content: 'That tool is not available to this user.', isError: true };
  try {
    return { content: JSON.stringify(await tool.run(viewer, input ?? {})).slice(0, 12_000), isError: false };
  } catch (error) {
    console.error('assistant tool failed', name, error instanceof Error ? error.message : error);
    return { content: 'The lookup failed.', isError: true };
  }
}
