import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { ArrowLeft, Pencil } from 'lucide-react';
import { db } from '@/server/db';
import { clients, leads, projects, proposalItems, proposals } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { isUuid, proposalScope } from '@/server/scope';
import { Button } from '@/components/ui/button';
import { KeyValue, PageHeader, Panel, StatusBadge, Table, Td, Th, Tr } from '@/components/portal/ui';
import { ConvertProposalButton, ProposalResponseButtons } from '@/components/portal/proposals/ProposalActions';
import { computeLine, formatMoney } from '@/lib/portal/invoice-math';
import { isOpenProposal } from '@/lib/portal/proposals';
import { fmtDate, fmtDateTime, todayIST } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Proposal' };

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let [p] = await db.select().from(proposals).where(and(eq(proposals.id, id), proposalScope(viewer)));
  if (!p) notFound();

  // First time the client opens a sent proposal, record it.
  if (!viewer.isInternal && p.status === 'sent') {
    const [updated] = await db.update(proposals).set({ status: 'viewed', viewedAt: new Date() }).where(and(eq(proposals.id, p.id), eq(proposals.status, 'sent'))).returning();
    if (updated) p = updated;
  }
  const [items, [client], [lead], [project]] = await Promise.all([
    db.select().from(proposalItems).where(eq(proposalItems.proposalId, p.id)).orderBy(asc(proposalItems.position)),
    p.clientId ? db.select({ name: clients.companyName }).from(clients).where(eq(clients.id, p.clientId)) : Promise.resolve([]),
    p.leadId ? db.select({ name: leads.name }).from(leads).where(eq(leads.id, p.leadId)) : Promise.resolve([]),
    p.projectId ? db.select({ id: projects.id, name: projects.name, code: projects.code }).from(projects).where(eq(projects.id, p.projectId)) : Promise.resolve([]),
  ]);
  const manage = can(viewer, 'proposals.manage');
  const expired = Boolean(p.validUntil && p.validUntil < todayIST());
  const answerable = isOpenProposal(p.status) && !expired && (viewer.isInternal ? manage : viewer.clientRole === 'owner');
  const money = (v: number) => formatMoney(v, p.currency);

  return (
    <>
      <Link href="/portal/proposals" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand">
        <ArrowLeft className="h-3.5 w-3.5" /> All proposals
      </Link>
      <PageHeader
        eyebrow={viewer.isInternal ? (client?.name ?? (lead ? `${lead.name} (lead)` : 'Proposal')) : 'Proposal'}
        title={p.title}
        description={<span className="inline-flex flex-wrap items-center gap-2"><StatusBadge status={expired && isOpenProposal(p.status) ? 'expired' : p.status} />{p.status !== 'draft' && <span className="font-mono text-xs">{p.number}</span>}</span>}
        actions={
          <>
            {manage && p.status === 'draft' && <Button asChild variant="secondary" className="h-10 rounded-lg px-4 text-sm"><Link href={`/portal/proposals/${p.id}/edit`}><Pencil className="h-4 w-4" /> Edit draft</Link></Button>}
            {manage && p.status === 'accepted' && can(viewer, 'projects.manage') && <ConvertProposalButton id={p.id} />}
            {project && viewer.isInternal && <Button asChild variant="secondary" className="h-10 rounded-lg px-4 text-sm"><Link href={`/portal/projects/${project.id}`}>Open {project.code}</Link></Button>}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {p.summary && <Panel title="Summary"><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{p.summary}</p></Panel>}
          <Panel title="Pricing" bodyClassName="pb-2">
            <Table>
              <thead><tr><Th>Deliverable</Th><Th className="text-right">Qty</Th><Th className="text-right">Rate</Th><Th className="text-right">Tax</Th><Th className="text-right">Amount</Th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <Tr key={i.id}>
                    <Td className="font-medium text-slate-900">{i.description}</Td>
                    <Td className="text-right tabular-nums">{i.quantity}</Td>
                    <Td className="text-right tabular-nums">{money(i.unitPricePaise)}</Td>
                    <Td className="text-right tabular-nums">{i.taxRatePct}%</Td>
                    <Td className="text-right font-semibold tabular-nums">{money(computeLine({ quantity: i.quantity, unitPricePaise: i.unitPricePaise, discountPct: i.discountPct, taxRatePct: i.taxRatePct }).taxablePaise)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5 pb-3 text-sm">
              <div className="flex justify-between text-slate-600"><dt>Subtotal</dt><dd className="tabular-nums">{money(p.subtotalPaise)}</dd></div>
              {p.discountPaise > 0 && <div className="flex justify-between text-slate-600"><dt>Discount</dt><dd className="tabular-nums">- {money(p.discountPaise)}</dd></div>}
              <div className="flex justify-between text-slate-600"><dt>Tax</dt><dd className="tabular-nums">{money(p.taxPaise)}</dd></div>
              <div className="flex justify-between rounded-xl bg-brand px-3 py-2 font-bold text-white"><dt>Total</dt><dd className="tabular-nums">{money(p.totalPaise)}</dd></div>
            </dl>
          </Panel>
          {p.scope && <Panel title="Scope of work"><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{p.scope}</p></Panel>}
          {p.terms && <Panel title="Terms"><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{p.terms}</p></Panel>}
        </div>
        <div className="space-y-6">
          {answerable && <Panel title={viewer.isInternal ? 'Record the client’s decision' : 'Your decision'}><ProposalResponseButtons id={p.id} internal={viewer.isInternal} /></Panel>}
          {expired && isOpenProposal(p.status) && <Panel><p className="text-sm text-rose-700">This proposal expired on {fmtDate(p.validUntil)}. {viewer.isInternal ? 'Create a new draft to re-quote.' : 'Please ask us for an updated one.'}</p></Panel>}
          <Panel title="Details">
            <KeyValue
              items={[
                { label: 'Currency', value: p.currency },
                { label: 'Valid until', value: fmtDate(p.validUntil) },
                { label: 'Sent', value: fmtDateTime(p.sentAt) },
                ...(viewer.isInternal ? [{ label: 'First viewed', value: p.viewedAt ? fmtDateTime(p.viewedAt) : 'Not yet' }] : []),
                { label: 'Decision', value: p.decidedAt ? `${p.status === 'rejected' ? 'Declined' : 'Accepted'} ${fmtDateTime(p.decidedAt)}` : '—' },
                ...(p.decisionNote ? [{ label: 'Note', value: p.decisionNote }] : []),
              ]}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
