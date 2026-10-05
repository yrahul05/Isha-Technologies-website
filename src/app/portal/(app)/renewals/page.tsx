import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, ne } from 'drizzle-orm';
import { AlarmClock, CalendarClock, CalendarX2, CircleDollarSign } from 'lucide-react';
import { db } from '@/server/db';
import { clients } from '@/server/db/schema';
import { can, requirePermission } from '@/server/auth/viewer';
import { renewalCenter } from '@/server/queries/renewals';
import { Badge, EmptyState, PageHeader, Panel, StatCard, Table, Td, Th, Tr, type Tone } from '@/components/portal/ui';
import { RenewalButton, RenewNowButton } from '@/components/portal/contracts/ContractForms';
import { formatMoney, formatMulti, sumByCurrency } from '@/lib/portal/invoice-math';
import { RENEWAL_KINDS, type Urgency } from '@/lib/portal/proposals';
import { fmtDate, todayIST } from '@/lib/portal/format';
import { addDays } from '@/lib/portal/time';

export const metadata: Metadata = { title: 'Renewal & Expiry Center' };

const URGENCY: Record<Urgency, { label: string; tone: Tone }> = {
  expired: { label: 'Expired', tone: 'red' },
  critical: { label: '≤ 7 days', tone: 'red' },
  soon: { label: '≤ 30 days', tone: 'amber' },
  upcoming: { label: '≤ 90 days', tone: 'sky' },
  later: { label: 'Later', tone: 'slate' },
};

export default async function RenewalsPage() {
  const viewer = await requirePermission('renewals.view');
  const manage = can(viewer, 'renewals.manage');
  const [rows, clientRows] = await Promise.all([
    renewalCenter(viewer),
    manage ? db.select({ id: clients.id, name: clients.companyName }).from(clients).where(ne(clients.status, 'inactive')).orderBy(asc(clients.companyName)) : Promise.resolve([]),
  ]);
  const due30 = rows.filter((r) => r.daysLeft <= 30);
  const expired = rows.filter((r) => r.daysLeft < 0);
  const suggested = (r: (typeof rows)[number]) => addDays(r.expiresOn > todayIST() ? r.expiresOn : todayIST(), 365);

  return (
    <>
      <PageHeader eyebrow="Finance" title="Renewal & Expiry Center" description="Domains, SSL, hosting, licences, AMCs and contracts — sorted by what expires first. Reminders go out automatically." actions={manage ? <RenewalButton clients={clientRows} /> : null} />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Tracked" value={rows.length} icon={CalendarClock} />
        <StatCard label="Due in 30 days" value={due30.length} icon={AlarmClock} tone="amber" hint={formatMulti(sumByCurrency(due30, (r) => r.currency, (r) => r.costPaise))} />
        <StatCard label="Expired" value={expired.length} icon={CalendarX2} tone={expired.length ? 'red' : 'green'} />
        <StatCard label="Renewal value (90d)" value={formatMulti(sumByCurrency(rows.filter((r) => r.daysLeft <= 90), (r) => r.currency, (r) => r.costPaise))} icon={CircleDollarSign} tone="violet" />
      </div>
      <Panel bodyClassName="pb-2">
        {rows.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nothing tracked yet" description="Add a domain, SSL certificate or licence — or activate a contract with an end date." />
        ) : (
          <Table>
            <thead><tr><Th>Item</Th><Th>Client</Th><Th>Expires</Th><Th>Urgency</Th><Th className="text-right">Cost / value</Th><Th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={`${r.source}-${r.id}`}>
                  <Td>
                    {r.href ? <Link href={r.href} className="font-medium text-slate-900 hover:text-brand">{r.name}</Link> : <span className="font-medium text-slate-900">{r.name}</span>}
                    <span className="block text-xs text-slate-500">{r.source === 'contract' ? 'Contract' : RENEWAL_KINDS.find((k) => k.value === r.kind)?.label ?? r.kind}{r.vendor ? ` · ${r.vendor}` : ''}{r.autoRenew ? ' · auto-renews' : ''}</span>
                  </Td>
                  <Td>{r.client ?? 'Isha Technologies'}</Td>
                  <Td>{fmtDate(r.expiresOn)}<span className="block text-xs text-slate-500">{r.daysLeft < 0 ? `${-r.daysLeft}d ago` : r.daysLeft === 0 ? 'today' : `in ${r.daysLeft}d`}</span></Td>
                  <Td><Badge tone={URGENCY[r.urgency].tone}>{URGENCY[r.urgency].label}</Badge></Td>
                  <Td className="text-right tabular-nums">{r.costPaise ? formatMoney(r.costPaise, r.currency) : '—'}</Td>
                  <Td className="text-right">
                    <span className="inline-flex items-center gap-1">
                      {(r.source === 'item' ? manage : can(viewer, 'contracts.manage')) && <RenewNowButton source={r.source} id={r.id} suggested={suggested(r)} />}
                      {r.source === 'item' && manage && <RenewalButton clients={clientRows} label="Edit" initial={{ id: r.id, name: r.name, kind: r.kind, clientId: r.clientId, vendor: r.vendor, expiresOn: r.expiresOn, cost: r.costPaise ? String(r.costPaise / 100) : '', currency: r.currency, autoRenew: r.autoRenew, remindDays: r.remindDays, notes: r.notes }} />}
                    </span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
