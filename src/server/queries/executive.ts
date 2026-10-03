import 'server-only';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, contracts, employees, invoices, leads, payments, proposals, timeEntries } from '@/server/db/schema';
import { can, ForbiddenError, type Viewer } from '@/server/auth/viewer';
import { projectProfitability } from '@/server/queries/profitability';
import { renewalCenter } from '@/server/queries/renewals';
import { todayIST } from '@/lib/portal/format';
import { addDays } from '@/lib/portal/time';

/** Likelihood weights per lead stage, used for the weighted pipeline forecast. */
export const STAGE_WEIGHT: Record<string, number> = { new: 0.05, contacted: 0.1, qualified: 0.25, proposal_sent: 0.5, negotiation: 0.7 };
export const STAGE_ORDER = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won'] as const;

const num = (v: unknown) => Number(v ?? 0);

function monthKeys(n: number) {
  const now = new Date(Date.now() + 5.5 * 3_600_000);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1));
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' }), sublabel: d.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }) };
  });
}

/**
 * Executive business analytics. Requires analytics.view; each section is
 * further gated by the permission that guards its underlying data (finance
 * needs invoices.view, utilisation needs time.view_all, …), so the dashboard
 * can never show someone a number they couldn't open elsewhere.
 * Money is INR only — mixed currencies can't be summed without an FX policy.
 */
export async function executiveDashboard(viewer: Viewer) {
  if (!viewer.isInternal || !can(viewer, 'analytics.view')) throw new ForbiddenError();
  const today = todayIST();
  const finance = can(viewer, 'invoices.view');
  const m12 = monthKeys(12);
  const since = `${m12[0].key}-01`;
  const since180 = addDays(today, -180);
  const since30 = addDays(today, -30);

  const [collected, billed, aging, payDays, topClients] = finance
    ? await Promise.all([
        db
          .select({ m: sql<string>`to_char(${payments.paidOn}::date, 'YYYY-MM')`, v: sql<number>`sum(${payments.amountPaise})::bigint` })
          .from(payments)
          .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
          .where(and(gte(payments.paidOn, since), eq(invoices.currency, 'INR')))
          .groupBy(sql`1`),
        db
          .select({ m: sql<string>`to_char(${invoices.issueDate}::date, 'YYYY-MM')`, v: sql<number>`sum(${invoices.totalPaise})::bigint` })
          .from(invoices)
          .where(and(gte(invoices.issueDate, since), eq(invoices.currency, 'INR'), inArray(invoices.status, ['sent', 'partially_paid', 'paid', 'overdue'])))
          .groupBy(sql`1`),
        db
          .select({ due: invoices.dueDate, bal: sql<number>`(${invoices.totalPaise} - ${invoices.paidPaise})::bigint` })
          .from(invoices)
          .where(and(inArray(invoices.status, ['sent', 'partially_paid', 'overdue']), eq(invoices.currency, 'INR'), sql`${invoices.totalPaise} > ${invoices.paidPaise}`)),
        db
          .select({ days: sql<number>`avg(l.last_paid - ${invoices.issueDate}::date)` })
          .from(invoices)
          .innerJoin(sql`(select invoice_id, max(paid_on::date) as last_paid from payments group by invoice_id) l`, sql`l.invoice_id = ${invoices.id}`)
          .where(and(eq(invoices.status, 'paid'), eq(invoices.currency, 'INR'), gte(invoices.issueDate, since180))),
        db
          .select({ name: clients.companyName, v: sql<number>`sum(${payments.amountPaise})::bigint` })
          .from(payments)
          .innerJoin(clients, eq(clients.id, payments.clientId))
          .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
          .where(and(gte(payments.paidOn, since), eq(invoices.currency, 'INR')))
          .groupBy(clients.companyName)
          .orderBy(desc(sql`2`))
          .limit(5),
      ])
    : [[], [], [], [], []];

  const bucketOf = (due: string) => {
    const late = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / 86_400_000);
    return late <= 0 ? 'Not yet due' : late <= 30 ? '1–30 days' : late <= 60 ? '31–60 days' : late <= 90 ? '61–90 days' : '90+ days';
  };
  const agingBuckets = ['Not yet due', '1–30 days', '31–60 days', '61–90 days', '90+ days'].map((label) => ({ label, value: aging.filter((r) => bucketOf(r.due) === label).reduce((s, r) => s + num(r.bal), 0) }));
  const collectedBy = new Map(collected.map((r) => [r.m, num(r.v)]));
  const billedBy = new Map(billed.map((r) => [r.m, num(r.v)]));
  const totalCollected = [...collectedBy.values()].reduce((a, b) => a + b, 0);

  const leadRows = can(viewer, 'leads.view') ? await db.select({ status: leads.status, n: sql<number>`count(*)::int`, v: sql<number>`coalesce(sum(${leads.estimatedValuePaise}), 0)::bigint` }).from(leads).groupBy(leads.status) : [];
  const funnel = STAGE_ORDER.map((s) => ({ stage: s, count: num(leadRows.find((r) => r.status === s)?.n), value: num(leadRows.find((r) => r.status === s)?.v) }));
  const lost = num(leadRows.find((r) => r.status === 'lost')?.n);
  const won = funnel.find((f) => f.stage === 'won')?.count ?? 0;
  const weighted = funnel.reduce((s, f) => s + f.value * (STAGE_WEIGHT[f.stage] ?? 0), 0);

  const proposalRows = can(viewer, 'proposals.view')
    ? await db
        .select({ status: proposals.status, n: sql<number>`count(*)::int`, v: sql<number>`coalesce(sum(${proposals.totalPaise}), 0)::bigint`, days: sql<number>`avg(extract(epoch from (${proposals.decidedAt} - ${proposals.sentAt})) / 86400)` })
        .from(proposals)
        .where(and(eq(proposals.currency, 'INR'), gte(proposals.createdAt, new Date(`${since180}T00:00:00Z`))))
        .groupBy(proposals.status)
    : [];
  const pCount = (...s: string[]) => proposalRows.filter((r) => s.includes(r.status)).reduce((a, r) => a + num(r.n), 0);
  const pValue = (...s: string[]) => proposalRows.filter((r) => s.includes(r.status)).reduce((a, r) => a + num(r.v), 0);
  const decided = pCount('accepted', 'converted', 'rejected', 'expired');
  const acceptedDays = proposalRows.filter((r) => ['accepted', 'converted'].includes(r.status) && r.days !== null);

  const util = can(viewer, 'time.view_all')
    ? await (async () => {
        const [t] = await db
          .select({ billable: sql<number>`coalesce(sum(case when ${timeEntries.billable} then ${timeEntries.minutes} else 0 end), 0)::int`, total: sql<number>`coalesce(sum(${timeEntries.minutes}), 0)::int` })
          .from(timeEntries)
          .where(gte(timeEntries.workDate, since30));
        const [cap] = await db.select({ hours: sql<number>`coalesce(sum(${employees.weeklyCapacityHours}), 0)::int` }).from(employees);
        const capacityMinutes = (num(cap?.hours) * 60 * 30) / 7;
        return { billableHours: Math.round(num(t?.billable) / 6) / 10, totalHours: Math.round(num(t?.total) / 6) / 10, pct: capacityMinutes ? Math.round((num(t?.total) / capacityMinutes) * 100) : null, billablePct: num(t?.total) ? Math.round((num(t?.billable) / num(t?.total)) * 100) : null };
      })()
    : null;

  const profit = can(viewer, 'time.view_all') ? await projectProfitability(viewer) : null;
  const revenue = profit?.reduce((s, r) => s + r.revenuePaise, 0) ?? 0;
  const cost = profit?.reduce((s, r) => s + r.costPaise, 0) ?? 0;

  const renewals = can(viewer, 'renewals.view') ? await renewalCenter(viewer) : null;
  const contractValue = can(viewer, 'contracts.view') ? num((await db.select({ v: sql<number>`coalesce(sum(${contracts.valuePaise}), 0)::bigint` }).from(contracts).where(and(eq(contracts.status, 'active'), eq(contracts.currency, 'INR'))))[0]?.v) : null;

  return {
    finance,
    months: m12.map((m) => ({ ...m, collected: collectedBy.get(m.key) ?? 0, billed: billedBy.get(m.key) ?? 0 })),
    totalCollected,
    outstanding: agingBuckets.reduce((s, b) => s + b.value, 0),
    overdue: agingBuckets.slice(1).reduce((s, b) => s + b.value, 0),
    agingBuckets,
    avgDaysToPay: payDays[0]?.days === null || payDays[0]?.days === undefined ? null : Math.round(num(payDays[0].days)),
    topClients: topClients.map((c) => ({ name: c.name, value: num(c.v), share: totalCollected ? Math.round((num(c.v) / totalCollected) * 100) : 0 })),
    funnel,
    weightedPipeline: Math.round(weighted),
    winRate: won + lost ? Math.round((won / (won + lost)) * 100) : null,
    proposals: { open: pCount('sent', 'viewed'), openValue: pValue('sent', 'viewed'), accepted: pCount('accepted', 'converted'), acceptedValue: pValue('accepted', 'converted'), winRate: decided ? Math.round((pCount('accepted', 'converted') / decided) * 100) : null, avgDaysToDecision: acceptedDays.length ? Math.round((acceptedDays.reduce((s, r) => s + num(r.days), 0) / acceptedDays.length) * 10) / 10 : null },
    util,
    margin: profit ? { revenue, cost, pct: revenue ? Math.round(((revenue - cost) / revenue) * 100) : null, worst: [...profit].filter((p) => p.revenuePaise > 0 || p.costPaise > 0).sort((a, b) => a.marginPaise - b.marginPaise).slice(0, 5) } : null,
    renewals: renewals ? { due30: renewals.filter((r) => r.daysLeft <= 30).length, expired: renewals.filter((r) => r.daysLeft < 0).length, soon: renewals.slice(0, 5) } : null,
    contractValue,
  };
}
