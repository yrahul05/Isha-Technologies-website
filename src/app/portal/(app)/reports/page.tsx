import type { Metadata } from 'next';
import { and, count, desc, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import { Clock, Percent, ReceiptIndianRupee, TrendingUp } from 'lucide-react';
import { db } from '@/server/db';
import { clients, invoices, leads, payments, projects, tasks, tickets } from '@/server/db/schema';
import { can, requirePermission } from '@/server/auth/viewer';
import { PageHeader, Panel, StatCard } from '@/components/portal/ui';
import { BarList, ColumnChart } from '@/components/portal/charts';
import { formatINR } from '@/lib/portal/invoice-math';
import { humanize, todayIST } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Reports' };

function months(n: number) {
  const now = new Date(Date.now() + 5.5 * 3_600_000);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1));
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' }), sublabel: d.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }) };
  });
}

export default async function ReportsPage() {
  const viewer = await requirePermission('reports.view');
  const finance = can(viewer, 'invoices.view');
  const today = todayIST();
  const m12 = months(12);
  const since = `${m12[0].key}-01`;
  const weekStart = new Date(Date.now() - 8 * 7 * 86_400_000);

  const [paid, billed, byClient, openInvoices, throughput, projectStatus, leadStatus, leadSource, ticketStats] = await Promise.all([
    // Revenue reports are in INR; USD/CAD totals are reported per currency on the Invoices page.
    finance
      ? db
          .select({ m: sql<string>`to_char(${payments.paidOn}::date, 'YYYY-MM')`, v: sql<number>`sum(${payments.amountPaise})::bigint` })
          .from(payments)
          .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
          .where(and(gte(payments.paidOn, since), eq(invoices.currency, 'INR')))
          .groupBy(sql`1`)
      : Promise.resolve([]),
    finance
      ? db
          .select({ m: sql<string>`to_char(${invoices.issueDate}::date, 'YYYY-MM')`, v: sql<number>`sum(${invoices.totalPaise})::bigint` })
          .from(invoices)
          .where(and(gte(invoices.issueDate, since), eq(invoices.currency, 'INR'), inArray(invoices.status, ['sent', 'partially_paid', 'paid', 'overdue'])))
          .groupBy(sql`1`)
      : Promise.resolve([]),
    finance
      ? db
          .select({ name: clients.companyName, v: sql<number>`sum(${payments.amountPaise})::bigint` })
          .from(payments)
          .innerJoin(clients, eq(clients.id, payments.clientId))
          .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
          .where(eq(invoices.currency, 'INR'))
          .groupBy(clients.companyName)
          .orderBy(desc(sql`2`))
          .limit(8)
      : Promise.resolve([]),
    finance
      ? db
          .select({ due: invoices.dueDate, bal: sql<number>`(${invoices.totalPaise} - ${invoices.paidPaise})::bigint` })
          .from(invoices)
          .where(and(eq(invoices.currency, 'INR'), inArray(invoices.status, ['sent', 'partially_paid', 'overdue']), sql`${invoices.paidPaise} < ${invoices.totalPaise}`))
      : Promise.resolve([]),
    db
      .select({ w: sql<string>`to_char(date_trunc('week', ${tasks.completedAt} + interval '330 minutes'), 'YYYY-MM-DD')`, n: count() })
      .from(tasks)
      .where(and(isNotNull(tasks.completedAt), gte(tasks.completedAt, weekStart)))
      .groupBy(sql`1`),
    db.select({ s: projects.status, n: count() }).from(projects).groupBy(projects.status),
    db.select({ s: leads.status, n: count(), v: sql<number>`sum(${leads.estimatedValuePaise})::bigint` }).from(leads).groupBy(leads.status),
    db.select({ s: leads.source, n: count(), won: sql<number>`count(*) filter (where ${leads.status} = 'won')::int` }).from(leads).groupBy(leads.source),
    db
      .select({
        open: sql<number>`count(*) filter (where ${tickets.status} in ('open','in_progress','waiting_for_client'))::int`,
        resolved: sql<number>`count(*) filter (where ${tickets.resolvedAt} is not null)::int`,
        avgHours: sql<number>`coalesce(avg(extract(epoch from (${tickets.resolvedAt} - ${tickets.createdAt})) / 3600) filter (where ${tickets.resolvedAt} is not null), 0)::float`,
      })
      .from(tickets),
  ]);

  const paidBy = new Map(paid.map((r) => [r.m, Number(r.v)]));
  const billedBy = new Map(billed.map((r) => [r.m, Number(r.v)]));
  const collected12 = [...paidBy.values()].reduce((s, v) => s + v, 0);
  const billed12 = [...billedBy.values()].reduce((s, v) => s + v, 0);

  const aging = { current: 0, d30: 0, d60: 0, d90: 0, d90p: 0 };
  for (const inv of openInvoices) {
    const late = Math.round((new Date(today).getTime() - new Date(inv.due).getTime()) / 86_400_000);
    const b = Number(inv.bal);
    if (late <= 0) aging.current += b;
    else if (late <= 30) aging.d30 += b;
    else if (late <= 60) aging.d60 += b;
    else if (late <= 90) aging.d90 += b;
    else aging.d90p += b;
  }

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(Date.now() + 5.5 * 3_600_000 - (7 - i) * 7 * 86_400_000);
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
    return monday.toISOString().slice(0, 10);
  });
  const tp = new Map(throughput.map((r) => [r.w, r.n]));
  const totalLeads = leadStatus.reduce((s, r) => s + r.n, 0);
  const won = leadStatus.find((r) => r.s === 'won')?.n ?? 0;
  const lost = leadStatus.find((r) => r.s === 'lost')?.n ?? 0;

  return (
    <>
      <PageHeader eyebrow="Business intelligence" title="Reports" description="Revenue, receivables, delivery throughput, pipeline and support performance. Financial figures are in INR; USD/CAD totals appear per currency on the Invoices page." />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {finance && <StatCard label="Collected (12 months)" value={formatINR(collected12, { compact: true })} icon={TrendingUp} tone="green" />}
        {finance && <StatCard label="Billed (12 months)" value={formatINR(billed12, { compact: true })} icon={ReceiptIndianRupee} />}
        <StatCard label="Lead win rate" value={won + lost ? `${Math.round((won / (won + lost)) * 100)}%` : '—'} icon={Percent} tone="violet" hint={`${totalLeads} leads all time`} />
        <StatCard label="Avg. ticket resolution" value={ticketStats[0]?.resolved ? `${Math.round(ticketStats[0].avgHours)}h` : '—'} icon={Clock} tone="sky" hint={`${ticketStats[0]?.open ?? 0} open now`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {finance && (
          <>
            <Panel title="Payments received" description="Last 12 months">
              <ColumnChart data={m12.map((m) => ({ label: m.label, sublabel: m.sublabel, value: paidBy.get(m.key) ?? 0 }))} format="inr-compact" ariaLabel="Payments received per month, last 12 months" />
            </Panel>
            <Panel title="Amount invoiced" description="Issued invoices, last 12 months">
              <ColumnChart data={m12.map((m) => ({ label: m.label, sublabel: m.sublabel, value: billedBy.get(m.key) ?? 0 }))} format="inr-compact" ariaLabel="Amount invoiced per month, last 12 months" />
            </Panel>
            <Panel title="Revenue by client" description="Lifetime payments, top 8">
              {byClient.length ? <BarList format="inr-compact" rows={byClient.map((r) => ({ key: r.name, label: r.name, value: Number(r.v) }))} /> : <p className="text-sm text-slate-500">No payments yet.</p>}
            </Panel>
            <Panel title="Receivables aging" description="Outstanding balance by days past due">
              <BarList
                format="inr-compact"
                rows={[
                  { key: 'c', label: 'Not yet due', value: aging.current },
                  { key: '30', label: '1–30 days', value: aging.d30 },
                  { key: '60', label: '31–60 days', value: aging.d60 },
                  { key: '90', label: '61–90 days', value: aging.d90 },
                  { key: '90p', label: '90+ days', value: aging.d90p },
                ]}
              />
            </Panel>
          </>
        )}
        <Panel title="Delivery throughput" description="Tasks completed per week, last 8 weeks">
          <ColumnChart
            data={weeks.map((w) => ({ label: new Date(`${w}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }), sublabel: `Week of ${new Date(`${w}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' })}`, value: tp.get(w) ?? 0 }))}
            format="number"
            ariaLabel="Tasks completed per week"
          />
        </Panel>
        <Panel title="Projects by status">
          <BarList rows={projectStatus.map((r) => ({ key: r.s, label: humanize(r.s), value: r.n }))} />
        </Panel>
        <Panel title="Sales pipeline" description="Leads by stage">
          <BarList rows={['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'].map((s) => ({ key: s, label: humanize(s), value: leadStatus.find((r) => r.s === s)?.n ?? 0 }))} />
        </Panel>
        <Panel title="Lead sources" description="Volume and wins by channel">
          <BarList rows={leadSource.map((r) => ({ key: r.s, label: `${humanize(r.s)} · ${r.won} won`, value: r.n }))} />
        </Panel>
      </div>
    </>
  );
}

