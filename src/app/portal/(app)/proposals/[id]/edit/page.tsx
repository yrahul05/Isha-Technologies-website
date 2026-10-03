import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { and, asc, eq, ne, notInArray } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, leads, proposalItems, proposals } from '@/server/db/schema';
import { requirePermission } from '@/server/auth/viewer';
import { isUuid, proposalScope } from '@/server/scope';
import { getSetting } from '@/server/settings';
import { PageHeader } from '@/components/portal/ui';
import { ProposalEditor } from '@/components/portal/proposals/ProposalEditor';

export const metadata: Metadata = { title: 'Edit proposal' };

export default async function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requirePermission('proposals.manage');
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [p] = await db.select().from(proposals).where(and(eq(proposals.id, id), proposalScope(viewer)));
  if (!p || p.status !== 'draft') notFound();
  const [items, clientRows, leadRows, invoice] = await Promise.all([
    db.select().from(proposalItems).where(eq(proposalItems.proposalId, p.id)).orderBy(asc(proposalItems.position)),
    db.select().from(clients).where(ne(clients.status, 'inactive')).orderBy(asc(clients.companyName)),
    db.select({ id: leads.id, name: leads.name, company: leads.company }).from(leads).where(notInArray(leads.status, ['won', 'lost'])).orderBy(asc(leads.name)),
    getSetting('invoice'),
  ]);
  return (
    <>
      <PageHeader eyebrow="Business" title="Edit draft proposal" />
      <ProposalEditor
        clients={clientRows.map((c) => ({ id: c.id, name: c.companyName, international: Boolean(c.country && !/^india$/i.test(c.country.trim())) }))}
        leads={leadRows.map((l) => ({ id: l.id, name: l.company ? `${l.name} · ${l.company}` : l.name }))}
        defaultTerms={invoice.defaultTerms}
        initial={{
          id: p.id,
          title: p.title,
          clientId: p.clientId,
          leadId: p.leadId,
          currency: p.currency,
          validUntil: p.validUntil,
          summary: p.summary,
          scope: p.scope,
          terms: p.terms,
          items: items.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: String(i.unitPricePaise / 100), discountPct: String(i.discountPct), taxRatePct: String(i.taxRatePct) })),
        }}
      />
    </>
  );
}
