import 'server-only';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, employees, invoices, projects, timeEntries } from '@/server/db/schema';
import { can, type Viewer } from '@/server/auth/viewer';
import { ForbiddenError } from '@/server/auth/viewer';

export type ProjectProfit = {
  projectId: string;
  code: string;
  name: string;
  client: string;
  status: string;
  hourlyRatePaise: number;
  budgetPaise: number;
  hours: number;
  billableHours: number;
  /** Loaded cost of logged time (INR paise). */
  costPaise: number;
  /** Net invoiced (INR, excl. tax, excl. drafts/cancelled). */
  revenuePaise: number;
  /** Cash actually received against those invoices (INR, incl. tax). */
  collectedPaise: number;
  /** Value of billable time at the project rate — what the hours are "worth". */
  timeValuePaise: number;
  marginPaise: number;
  /** Margin as % of revenue, null when nothing is billed yet. */
  marginPct: number | null;
  /** Share of the budget consumed by cost, null when no budget. */
  budgetUsedPct: number | null;
  /** Hours logged by people with no cost rate set — makes cost understated. */
  unratedHours: number;
};

/**
 * Per-project profitability. Requires time.view_all (costs are sensitive).
 * Only INR invoices are summed — mixed currencies can't be added without an
 * FX policy — and the UI says so.
 */
export async function projectProfitability(viewer: Viewer): Promise<ProjectProfit[]> {
  if (!viewer.isInternal || !can(viewer, 'time.view_all')) throw new ForbiddenError();

  const base = await db
    .select({ p: projects, client: clients.companyName })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(ne(projects.status, 'cancelled'));
  if (base.length === 0) return [];
  const ids = base.map((b) => b.p.id);

  const timeRows = await db
    .select({
      projectId: timeEntries.projectId,
      minutes: sql<number>`coalesce(sum(${timeEntries.minutes}), 0)::int`,
      billableMinutes: sql<number>`coalesce(sum(case when ${timeEntries.billable} then ${timeEntries.minutes} else 0 end), 0)::int`,
      cost: sql<number>`coalesce(sum(${timeEntries.minutes} * coalesce(${employees.hourlyCostPaise}, 0) / 60.0), 0)::bigint`,
      unrated: sql<number>`coalesce(sum(case when coalesce(${employees.hourlyCostPaise}, 0) = 0 then ${timeEntries.minutes} else 0 end), 0)::int`,
    })
    .from(timeEntries)
    .leftJoin(employees, eq(employees.userId, timeEntries.userId))
    .where(inArray(timeEntries.projectId, ids))
    .groupBy(timeEntries.projectId);
  const invoiceRows = await db
    .select({
      projectId: invoices.projectId,
      net: sql<number>`coalesce(sum(${invoices.subtotalPaise} - ${invoices.discountPaise}), 0)::bigint`,
      collected: sql<number>`coalesce(sum(${invoices.paidPaise}), 0)::bigint`,
    })
    .from(invoices)
    .where(and(inArray(invoices.projectId, ids), eq(invoices.currency, 'INR'), inArray(invoices.status, ['sent', 'partially_paid', 'paid', 'overdue'])))
    .groupBy(invoices.projectId);

  const time = new Map(timeRows.map((r) => [r.projectId, r]));
  const money = new Map(invoiceRows.map((r) => [r.projectId, r]));
  return base
    .map(({ p, client }): ProjectProfit => {
      const t = time.get(p.id);
      const inv = money.get(p.id);
      const minutes = Number(t?.minutes ?? 0);
      const billable = Number(t?.billableMinutes ?? 0);
      const cost = Math.round(Number(t?.cost ?? 0));
      const revenue = Number(inv?.net ?? 0);
      const margin = revenue - cost;
      return {
        projectId: p.id,
        code: p.code,
        name: p.name,
        client,
        status: p.status,
        hourlyRatePaise: p.hourlyRatePaise,
        budgetPaise: p.budgetPaise,
        hours: Math.round((minutes / 60) * 10) / 10,
        billableHours: Math.round((billable / 60) * 10) / 10,
        costPaise: cost,
        revenuePaise: revenue,
        collectedPaise: Number(inv?.collected ?? 0),
        timeValuePaise: Math.round((billable * p.hourlyRatePaise) / 60),
        marginPaise: margin,
        marginPct: revenue > 0 ? Math.round((margin / revenue) * 1000) / 10 : null,
        budgetUsedPct: p.budgetPaise > 0 ? Math.round((cost / p.budgetPaise) * 1000) / 10 : null,
        unratedHours: Math.round((Number(t?.unrated ?? 0) / 60) * 10) / 10,
      };
    })
    .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
}
