import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq, ne, and } from 'drizzle-orm';
import { AlertTriangle, BadgeIndianRupee, Clock, TrendingUp } from 'lucide-react';
import { db } from '@/server/db';
import { employees, users } from '@/server/db/schema';
import { can, requirePermission } from '@/server/auth/viewer';
import { projectProfitability } from '@/server/queries/profitability';
import { Badge, EmptyState, PageHeader, Panel, StatCard, Table, Td, Th, Tr } from '@/components/portal/ui';
import { RateForm } from '@/components/portal/time/TimeForms';
import { formatINR } from '@/lib/portal/invoice-math';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Project profitability' };

export default async function ProfitabilityPage() {
  const viewer = await requirePermission('time.view_all');
  const rows = await projectProfitability(viewer);
  const people = can(viewer, 'team.manage')
    ? await db
        .select({ id: users.id, name: users.name, rate: employees.hourlyCostPaise })
        .from(users)
        .leftJoin(employees, eq(employees.userId, users.id))
        .where(and(ne(users.role, 'client'), eq(users.isActive, true)))
        .orderBy(asc(users.name))
    : [];

  const revenue = rows.reduce((s, r) => s + r.revenuePaise, 0);
  const cost = rows.reduce((s, r) => s + r.costPaise, 0);
  const hours = rows.reduce((s, r) => s + r.hours, 0);
  const unrated = rows.reduce((s, r) => s + r.unratedHours, 0);

  return (
    <>
      <PageHeader eyebrow="Business" title="Project profitability" description="Net invoiced revenue against the loaded cost of logged time. INR invoices only; costs use each person’s hourly cost rate." />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Net invoiced" value={formatINR(revenue, { compact: true })} icon={BadgeIndianRupee} tone="green" />
        <StatCard label="Time cost" value={formatINR(cost, { compact: true })} icon={Clock} tone="amber" />
        <StatCard label="Margin" value={revenue ? `${Math.round(((revenue - cost) / revenue) * 100)}%` : '—'} icon={TrendingUp} tone={revenue - cost < 0 ? 'red' : 'violet'} hint={formatINR(revenue - cost, { compact: true })} />
        <StatCard label="Hours logged" value={Math.round(hours)} icon={Clock} />
      </div>
      {unrated > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {Math.round(unrated)}h were logged by people without an hourly cost rate, so cost is understated until you set rates below.
        </p>
      )}
      <Panel title="Projects" bodyClassName="pb-2">
        {rows.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No projects yet" description="Profitability appears once projects have time and invoices." />
        ) : (
          <Table>
            <thead>
              <tr><Th>Project</Th><Th className="text-right">Hours</Th><Th className="text-right">Revenue</Th><Th className="text-right">Cost</Th><Th className="text-right">Margin</Th><Th className="text-right">Budget used</Th>{can(viewer, 'projects.manage') && <Th>Bill rate</Th>}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.projectId}>
                  <Td><Link href={`/portal/projects/${r.projectId}`} className="font-medium text-slate-900 hover:text-brand">{r.name}</Link><span className="block text-xs text-slate-500">{r.client}</span></Td>
                  <Td className="text-right tabular-nums">{r.hours}<span className="block text-xs text-slate-400">{r.billableHours} billable</span></Td>
                  <Td className="text-right tabular-nums">{formatINR(r.revenuePaise)}</Td>
                  <Td className="text-right tabular-nums">{formatINR(r.costPaise)}</Td>
                  <Td className={cn('text-right font-semibold tabular-nums', r.marginPaise < 0 ? 'text-rose-600' : 'text-emerald-700')}>{formatINR(r.marginPaise)}{r.marginPct !== null && <span className="block text-xs font-normal">{r.marginPct}%</span>}</Td>
                  <Td className="text-right">{r.budgetUsedPct === null ? <span className="text-slate-400">—</span> : <Badge tone={r.budgetUsedPct > 100 ? 'red' : r.budgetUsedPct > 80 ? 'amber' : 'green'}>{r.budgetUsedPct}%</Badge>}</Td>
                  {can(viewer, 'projects.manage') && <Td><RateForm kind="bill" targetId={r.projectId} current={r.hourlyRatePaise} label={`Billing rate for ${r.name}`} /></Td>}
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      {people.length > 0 && (
        <Panel className="mt-6" title="Hourly cost rates" description="Loaded cost per hour (salary + overhead). Visible to people with timesheet access only." bodyClassName="pb-2">
          <Table>
            <thead><tr><Th>Team member</Th><Th>Cost per hour (₹)</Th></tr></thead>
            <tbody>
              {people.map((p) => (
                <Tr key={p.id}><Td className="font-medium text-slate-900">{p.name}</Td><Td><RateForm kind="cost" targetId={p.id} current={p.rate ?? 0} label={`Hourly cost for ${p.name}`} /></Td></Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}
    </>
  );
}
