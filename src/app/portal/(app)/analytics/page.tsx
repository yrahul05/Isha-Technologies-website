import type { Metadata } from 'next';
import Link from 'next/link';
import { AlarmClock, BadgeIndianRupee, Gauge, Hourglass, Percent, Target, Timer, TrendingUp, Wallet } from 'lucide-react';
import { requirePermission } from '@/server/auth/viewer';
import { executiveDashboard } from '@/server/queries/executive';
import { Badge, PageHeader, Panel, StatCard } from '@/components/portal/ui';
import { BarList, ColumnChart } from '@/components/portal/charts';
import { formatINR } from '@/lib/portal/invoice-math';
import { humanize } from '@/lib/portal/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Business analytics' };

export default async function AnalyticsPage() {
  const viewer = await requirePermission('analytics.view');
  const d = await executiveDashboard(viewer);
  const maxFunnel = Math.max(1, ...d.funnel.map((f) => f.count));

  return (
    <>
      <PageHeader eyebrow="Business" title="Executive analytics" description="Revenue, cash, pipeline, delivery and renewals in one view. Money figures are INR; other currencies are excluded." />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {d.finance && <StatCard label="Collected (12 mo)" value={formatINR(d.totalCollected, { compact: true })} icon={BadgeIndianRupee} tone="green" />}
        {d.finance && <StatCard label="Outstanding" value={formatINR(d.outstanding, { compact: true })} icon={Wallet} tone="amber" hint={d.overdue ? `${formatINR(d.overdue, { compact: true })} overdue` : 'Nothing overdue'} href="/portal/invoices" />}
        {d.finance && <StatCard label="Avg. days to pay" value={d.avgDaysToPay ?? '—'} icon={Timer} tone="violet" hint="paid invoices, last 180 days" />}
        <StatCard label="Weighted pipeline" value={formatINR(d.weightedPipeline, { compact: true })} icon={Target} hint={d.winRate !== null ? `${d.winRate}% lead win rate` : undefined} href="/portal/leads" />
        {d.margin && <StatCard label="Project margin" value={d.margin.pct === null ? '—' : `${d.margin.pct}%`} icon={Percent} tone={d.margin.pct !== null && d.margin.pct < 0 ? 'red' : 'green'} hint={`${formatINR(d.margin.revenue - d.margin.cost, { compact: true })} on ${formatINR(d.margin.revenue, { compact: true })}`} href="/portal/profitability" />}
        {d.util && <StatCard label="Utilisation (30d)" value={d.util.pct === null ? '—' : `${d.util.pct}%`} icon={Gauge} tone="violet" hint={`${d.util.billablePct ?? 0}% billable · ${d.util.totalHours}h logged`} href="/portal/time?scope=team" />}
        {d.renewals && <StatCard label="Renewals due (30d)" value={d.renewals.due30} icon={AlarmClock} tone={d.renewals.expired ? 'red' : 'amber'} hint={d.renewals.expired ? `${d.renewals.expired} already expired` : undefined} href="/portal/renewals" />}
        {d.contractValue !== null && <StatCard label="Active contract value" value={formatINR(d.contractValue, { compact: true })} icon={TrendingUp} href="/portal/contracts" />}
      </div>

      {d.finance && (
        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <Panel title="Cash collected" description="INR payments received, last 12 months">
            <ColumnChart data={d.months.map((m) => ({ label: m.label, sublabel: m.sublabel, value: m.collected }))} format="inr-compact" ariaLabel="Cash collected per month" />
          </Panel>
          <Panel title="Invoiced" description="INR invoices issued, last 12 months">
            <ColumnChart data={d.months.map((m) => ({ label: m.label, sublabel: m.sublabel, value: m.billed }))} format="inr-compact" ariaLabel="Amount invoiced per month" highlightLast={false} />
          </Panel>
        </div>
      )}

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        {d.finance && (
          <Panel title="Receivables ageing" description="Open INR balances by days past due">
            <BarList format="inr-compact" rows={d.agingBuckets.map((b) => ({ key: b.label, label: b.label, value: b.value }))} />
          </Panel>
        )}
        <Panel title="Sales funnel" description="Leads by stage (all time)">
          <ul className="space-y-3">
            {d.funnel.map((f) => (
              <li key={f.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-700">{humanize(f.stage)}</span>
                  <span className="font-semibold tabular-nums text-slate-900">{f.count}{f.value > 0 && <span className="ml-2 text-xs font-normal text-slate-500">{formatINR(f.value, { compact: true })}</span>}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', f.stage === 'won' ? 'bg-emerald-500' : 'bg-brand/70')} style={{ width: `${(f.count / maxFunnel) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Proposals" description="Last 180 days, INR">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-xs text-slate-500">Awaiting decision</dt><dd className="text-xl font-bold tabular-nums text-slate-900">{d.proposals.open}</dd><dd className="text-xs text-slate-500">{formatINR(d.proposals.openValue, { compact: true })}</dd></div>
            <div><dt className="text-xs text-slate-500">Accepted</dt><dd className="text-xl font-bold tabular-nums text-emerald-700">{d.proposals.accepted}</dd><dd className="text-xs text-slate-500">{formatINR(d.proposals.acceptedValue, { compact: true })}</dd></div>
            <div><dt className="text-xs text-slate-500">Win rate</dt><dd className="text-xl font-bold tabular-nums text-slate-900">{d.proposals.winRate === null ? '—' : `${d.proposals.winRate}%`}</dd></div>
            <div><dt className="text-xs text-slate-500">Days to accept</dt><dd className="text-xl font-bold tabular-nums text-slate-900">{d.proposals.avgDaysToDecision ?? '—'}</dd></div>
          </dl>
          <Link href="/portal/proposals" className="mt-4 inline-block text-xs font-semibold text-brand hover:underline">Open proposals →</Link>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {d.finance && d.topClients.length > 0 && (
          <Panel title="Client concentration" description="Share of INR cash collected (12 mo)">
            <BarList format="percent" max={100} rows={d.topClients.map((c) => ({ key: c.name, label: c.name, value: c.share, hint: formatINR(c.value) }))} />
            {d.topClients[0] && d.topClients[0].share >= 40 && <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700"><Hourglass className="h-3.5 w-3.5" /> {d.topClients[0].name} is {d.topClients[0].share}% of collections — a concentration risk.</p>}
          </Panel>
        )}
        {d.margin && d.margin.worst.length > 0 && (
          <Panel title="Lowest-margin projects" description="Net invoiced minus time cost">
            <ul className="divide-y divide-gray-100 text-sm">
              {d.margin.worst.map((p) => (
                <li key={p.projectId} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/portal/projects/${p.projectId}`} className="min-w-0 truncate font-medium text-slate-900 hover:text-brand">{p.name}</Link>
                  <Badge tone={p.marginPaise < 0 ? 'red' : 'amber'}>{formatINR(p.marginPaise, { compact: true })}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {d.renewals && d.renewals.soon.length > 0 && (
          <Panel title="Next to expire" action={<Link href="/portal/renewals" className="text-xs font-semibold text-brand hover:underline">All renewals</Link>}>
            <ul className="divide-y divide-gray-100 text-sm">
              {d.renewals.soon.map((r) => (
                <li key={`${r.source}-${r.id}`} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate text-slate-900">{r.name}<span className="block text-xs text-slate-500">{r.client ?? 'Isha Technologies'}</span></span>
                  <Badge tone={r.daysLeft < 0 ? 'red' : r.daysLeft <= 7 ? 'red' : r.daysLeft <= 30 ? 'amber' : 'slate'}>{r.daysLeft < 0 ? `${-r.daysLeft}d ago` : `${r.daysLeft}d`}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
