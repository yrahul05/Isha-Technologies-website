import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { CheckCircle2, FileSignature, Hourglass, Send } from 'lucide-react';
import { db } from '@/server/db';
import { clients, leads, proposals } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { proposalScope } from '@/server/scope';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, Table, Td, Th, Tr } from '@/components/portal/ui';
import { formatMoney, formatMulti, sumByCurrency } from '@/lib/portal/invoice-math';
import { fmtDate } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Proposals' };

export default async function ProposalsPage() {
  const viewer = await requireViewer();
  const rows = await db
    .select({ p: proposals, client: clients.companyName, lead: leads.name })
    .from(proposals)
    .leftJoin(clients, eq(clients.id, proposals.clientId))
    .leftJoin(leads, eq(leads.id, proposals.leadId))
    .where(proposalScope(viewer))
    .orderBy(desc(proposals.createdAt))
    .limit(300);
  const manage = can(viewer, 'proposals.manage');
  const open = rows.filter((r) => ['sent', 'viewed'].includes(r.p.status));
  const accepted = rows.filter((r) => ['accepted', 'converted'].includes(r.p.status));
  const decided = rows.filter((r) => ['accepted', 'converted', 'rejected', 'expired'].includes(r.p.status)).length;

  return (
    <>
      <PageHeader
        eyebrow={viewer.isInternal ? 'Business' : 'Account'}
        title={viewer.isInternal ? 'Proposals & quotations' : 'Proposals'}
        description={viewer.isInternal ? 'Quote a client or a lead, track the decision, then turn the accepted proposal into a project.' : 'Proposals we have sent you. Review and accept online.'}
        actions={manage ? <Button asChild className="h-10 rounded-lg px-4 text-sm"><Link href="/portal/proposals/new">New proposal</Link></Button> : null}
      />
      {viewer.isInternal && (
        <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Awaiting decision" value={open.length} icon={Hourglass} tone="amber" hint={formatMulti(sumByCurrency(open, (r) => r.p.currency, (r) => r.p.totalPaise))} />
          <StatCard label="Accepted" value={accepted.length} icon={CheckCircle2} tone="green" hint={formatMulti(sumByCurrency(accepted, (r) => r.p.currency, (r) => r.p.totalPaise))} />
          <StatCard label="Win rate" value={decided ? `${Math.round((accepted.length / decided) * 100)}%` : '—'} icon={FileSignature} tone="violet" />
          <StatCard label="Drafts" value={rows.filter((r) => r.p.status === 'draft').length} icon={Send} />
        </div>
      )}
      <Panel bodyClassName="pb-2">
        {rows.length === 0 ? (
          <EmptyState icon={FileSignature} title="No proposals yet" description={manage ? 'Create the first proposal for a client or lead.' : 'Nothing has been sent to you yet.'} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Title</Th>
                {viewer.isInternal && <Th>For</Th>}
                <Th>Status</Th>
                <Th>Valid until</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, client, lead }) => (
                <Tr key={p.id}>
                  <Td className="font-mono text-xs">{p.status === 'draft' ? 'Draft' : p.number}</Td>
                  <Td><Link href={`/portal/proposals/${p.id}`} className="font-medium text-slate-900 hover:text-brand">{p.title}</Link></Td>
                  {viewer.isInternal && <Td>{client ?? (lead ? `${lead} (lead)` : '—')}</Td>}
                  <Td><StatusBadge status={p.status} /></Td>
                  <Td>{fmtDate(p.validUntil)}</Td>
                  <Td className="text-right font-semibold tabular-nums">{formatMoney(p.totalPaise, p.currency)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
