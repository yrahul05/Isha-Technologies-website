import type { Metadata } from 'next';
import { asc, ne, notInArray } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, leads } from '@/server/db/schema';
import { requirePermission } from '@/server/auth/viewer';
import { getSetting } from '@/server/settings';
import { PageHeader } from '@/components/portal/ui';
import { ProposalEditor } from '@/components/portal/proposals/ProposalEditor';

export const metadata: Metadata = { title: 'New proposal' };

export default async function NewProposalPage({ searchParams }: { searchParams: Promise<{ client?: string; lead?: string }> }) {
  await requirePermission('proposals.manage');
  const { client, lead } = await searchParams;
  const [clientRows, leadRows, invoice] = await Promise.all([
    db.select().from(clients).where(ne(clients.status, 'inactive')).orderBy(asc(clients.companyName)),
    db.select({ id: leads.id, name: leads.name, company: leads.company }).from(leads).where(notInArray(leads.status, ['won', 'lost'])).orderBy(asc(leads.name)),
    getSetting('invoice'),
  ]);
  return (
    <>
      <PageHeader eyebrow="Business" title="New proposal" description="Totals are calculated on the server. A permanent proposal number is issued when you send it." />
      <ProposalEditor
        clients={clientRows.map((c) => ({ id: c.id, name: c.companyName, international: Boolean(c.country && !/^india$/i.test(c.country.trim())) }))}
        leads={leadRows.map((l) => ({ id: l.id, name: l.company ? `${l.name} · ${l.company}` : l.name }))}
        defaultClientId={client}
        defaultLeadId={lead}
        defaultTerms={invoice.defaultTerms}
      />
    </>
  );
}
