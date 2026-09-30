import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { AlarmClock, Target, TrendingUp, Trophy } from 'lucide-react';
import { db } from '@/server/db';
import { leads, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { leadScope } from '@/server/scope';
import { internalPeople } from '@/server/queries/people';
import { Badge, PageHeader, Panel, StatCard, StatusBadge, Table, Td, Th, Tr } from '@/components/portal/ui';
import { NewLeadButton, Pipeline, type PipelineLead } from '@/components/portal/leads/LeadUI';
import { formatINR } from '@/lib/portal/invoice-math';
import { fmtDateTime, humanize } from '@/lib/portal/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Leads' };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const viewer = await requireViewer();
  if (!viewer.isInternal) notFound();
  const { view } = await searchParams;
  const rows = await db
    .select({ l: leads, owner: users.name })
    .from(leads)
    .leftJoin(users, eq(users.id, leads.assignedTo))
    .where(leadScope(viewer))
    .orderBy(desc(leads.createdAt))
    .limit(500);
  const manage = can(viewer, 'leads.manage');
  const people = manage ? await internalPeople(viewer) : [];
  const now = Date.now();

  const open = rows.filter((r) => !['won', 'lost'].includes(r.l.status));
  const pipelineValue = open.reduce((s, r) => s + r.l.estimatedValuePaise, 0);
  const won = rows.filter((r) => r.l.status === 'won');
  const closed = rows.filter((r) => ['won', 'lost'].includes(r.l.status)).length;
  const followUps = open
    .filter((r) => r.l.followUpAt && r.l.followUpAt.getTime() < now + 2 * 86_400_000)
    .sort((a, b) => a.l.followUpAt!.getTime() - b.l.followUpAt!.getTime());

  const pipeline: PipelineLead[] = rows.map(({ l, owner }) => ({
    id: l.id,
    name: l.name,
    company: l.company,
    status: l.status,
    value: l.estimatedValuePaise,
    followUpAt: l.followUpAt ? l.followUpAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : null,
    overdue: Boolean(l.followUpAt && l.followUpAt.getTime() < now),
    owner,
    editable: manage || l.assignedTo === viewer.id,
  }));

  return (
    <>
      <PageHeader eyebrow="Business" title="Leads" description="Website assessments, enquiries and referrals — from first touch to signed client." actions={manage ? <NewLeadButton people={people} /> : null} />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Open leads" value={open.length} icon={Target} />
        <StatCard label="Pipeline value" value={formatINR(pipelineValue, { compact: true })} icon={TrendingUp} tone="violet" />
        <StatCard label="Won" value={won.length} icon={Trophy} tone="green" hint={closed ? `${Math.round((won.length / closed) * 100)}% win rate` : undefined} />
        <StatCard label="Follow-ups due (48h)" value={followUps.length} icon={AlarmClock} tone={followUps.some((f) => f.l.followUpAt!.getTime() < now) ? 'red' : 'amber'} />
      </div>

      {followUps.length > 0 && (
        <Panel className="mb-6" title="Follow-up reminders">
          <ul className="divide-y divide-gray-100">
            {followUps.map(({ l, owner }) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/portal/leads/${l.id}`} className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900 hover:text-brand">
                    {l.name} {l.company && <span className="font-normal text-slate-500">· {l.company}</span>}
                  </span>
                  <span className="text-xs text-slate-500">{owner ?? 'Unassigned'}</span>
                </Link>
                <span className={cn('shrink-0 text-xs font-semibold', l.followUpAt!.getTime() < now ? 'text-rose-600' : 'text-amber-700')}>{fmtDateTime(l.followUpAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mb-4 flex gap-1">
        {['pipeline', 'list'].map((v) => (
          <Link key={v} href={`/portal/leads${v === 'list' ? '?view=list' : ''}`} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', (view === 'list' ? 'list' : 'pipeline') === v ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-50')}>
            {humanize(v)}
          </Link>
        ))}
      </div>

      {view === 'list' ? (
        <Panel>
          <Table>
            <thead>
              <tr>
                <Th>Lead</Th>
                <Th>Source</Th>
                <Th>Owner</Th>
                <Th className="text-right">Value</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ l, owner }) => (
                <Tr key={l.id}>
                  <Td>
                    <Link href={`/portal/leads/${l.id}`} className="font-medium text-slate-900 hover:text-brand">
                      {l.name}
                    </Link>
                    <span className="block text-xs text-slate-500">{l.company ?? l.email}</span>
                  </Td>
                  <Td>
                    <Badge tone={l.source === 'website_assessment' ? 'brand' : 'slate'}>{humanize(l.source)}</Badge>
                  </Td>
                  <Td>{owner ?? '—'}</Td>
                  <Td className="text-right tabular-nums">{l.estimatedValuePaise ? formatINR(l.estimatedValuePaise, { compact: true }) : '—'}</Td>
                  <Td>
                    <StatusBadge status={l.status} />
                  </Td>
                  <Td className="text-xs text-slate-500">{fmtDateTime(l.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      ) : (
        <Pipeline leads={pipeline} />
      )}
    </>
  );
}
