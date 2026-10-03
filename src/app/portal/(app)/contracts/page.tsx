import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { FileSignature } from 'lucide-react';
import { db } from '@/server/db';
import { clients, contracts } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { contractScope } from '@/server/scope';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, Panel, StatusBadge, Table, Td, Th, Tr } from '@/components/portal/ui';
import { formatMoney } from '@/lib/portal/invoice-math';
import { CONTRACT_KINDS } from '@/lib/portal/proposals';
import { fmtDate } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Contracts' };

export default async function ContractsPage() {
  const viewer = await requireViewer();
  const rows = await db
    .select({ c: contracts, client: clients.companyName })
    .from(contracts)
    .innerJoin(clients, eq(clients.id, contracts.clientId))
    .where(contractScope(viewer))
    .orderBy(desc(contracts.createdAt))
    .limit(300);
  const manage = can(viewer, 'contracts.manage');
  const kind = (k: string) => CONTRACT_KINDS.find((x) => x.value === k)?.label ?? k;
  return (
    <>
      <PageHeader
        eyebrow={viewer.isInternal ? 'Business' : 'Account'}
        title="Contracts"
        description={viewer.isInternal ? 'Agreements, statements of work and AMCs — with start, end and renewal dates.' : 'Your active agreements with Isha Technologies.'}
        actions={manage ? <Button asChild className="h-10 rounded-lg px-4 text-sm"><Link href="/portal/contracts/new">New contract</Link></Button> : null}
      />
      <Panel bodyClassName="pb-2">
        {rows.length === 0 ? (
          <EmptyState icon={FileSignature} title="No contracts yet" description={manage ? 'Add the first contract to start tracking renewals.' : 'Nothing to show yet.'} />
        ) : (
          <Table>
            <thead><tr><Th>Number</Th><Th>Title</Th>{viewer.isInternal && <Th>Client</Th>}<Th>Type</Th><Th>Status</Th><Th>Ends</Th><Th className="text-right">Value</Th></tr></thead>
            <tbody>
              {rows.map(({ c, client }) => (
                <Tr key={c.id}>
                  <Td className="font-mono text-xs">{c.number}</Td>
                  <Td><Link href={`/portal/contracts/${c.id}`} className="font-medium text-slate-900 hover:text-brand">{c.title}</Link></Td>
                  {viewer.isInternal && <Td>{client}</Td>}
                  <Td>{kind(c.kind)}</Td>
                  <Td><StatusBadge status={c.status} /></Td>
                  <Td>{fmtDate(c.endDate)}</Td>
                  <Td className="text-right tabular-nums">{c.valuePaise ? formatMoney(c.valuePaise, c.currency) : '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
