import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { ArrowLeft, Download } from 'lucide-react';
import { db } from '@/server/db';
import { clients, contracts, documents, projects } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { contractScope, documentScope, isUuid } from '@/server/scope';
import { Button } from '@/components/ui/button';
import { KeyValue, PageHeader, Panel, StatusBadge } from '@/components/portal/ui';
import { ContractForm } from '@/components/portal/contracts/ContractForms';
import { formatMoney } from '@/lib/portal/invoice-math';
import { CONTRACT_KINDS, daysFromToday } from '@/lib/portal/proposals';
import { fmtDate, fmtDateTime, todayIST } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Contract' };

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [row] = await db
    .select({ c: contracts, client: clients.companyName })
    .from(contracts)
    .innerJoin(clients, eq(clients.id, contracts.clientId))
    .where(and(eq(contracts.id, id), contractScope(viewer)));
  if (!row) notFound();
  const { c, client } = row;
  const manage = can(viewer, 'contracts.manage');
  // The signed copy is only linked if the viewer is actually allowed to open that document.
  const [doc] = c.documentId ? await db.select({ id: documents.id, name: documents.name }).from(documents).where(and(eq(documents.id, c.documentId), documentScope(viewer))) : [];
  const [project] = c.projectId ? await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, c.projectId)) : [];
  const left = c.endDate && c.status === 'active' ? daysFromToday(c.endDate, todayIST()) : null;

  const [clientRows, projectRows, docRows] = manage
    ? await Promise.all([
        db.select({ id: clients.id, name: clients.companyName }).from(clients).orderBy(asc(clients.companyName)),
        db.select({ id: projects.id, name: projects.name, clientId: projects.clientId }).from(projects).orderBy(asc(projects.name)),
        db.select({ id: documents.id, name: documents.name, clientId: documents.clientId }).from(documents).where(and(isNull(documents.deletedAt), eq(documents.clientId, c.clientId))).orderBy(asc(documents.name)),
      ])
    : [[], [], []];

  return (
    <>
      <Link href="/portal/contracts" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand">
        <ArrowLeft className="h-3.5 w-3.5" /> All contracts
      </Link>
      <PageHeader
        eyebrow={viewer.isInternal ? client : 'Contract'}
        title={c.title}
        description={<span className="inline-flex flex-wrap items-center gap-2"><StatusBadge status={c.status} /><span className="font-mono text-xs">{c.number}</span></span>}
        actions={doc ? <Button asChild variant="secondary" className="h-10 rounded-lg px-4 text-sm"><a href={`/api/portal/documents/${doc.id}/download`}><Download className="h-4 w-4" /> Signed copy</a></Button> : null}
      />
      {left !== null && left <= (c.renewalNoticeDays || 30) && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          {left < 0 ? `This contract ended ${-left} day(s) ago.` : `This contract ends in ${left} day(s)${c.autoRenew ? ' and renews automatically' : ''}.`}
        </p>
      )}
      <Panel title="Details">
        <KeyValue
          items={[
            { label: 'Type', value: CONTRACT_KINDS.find((k) => k.value === c.kind)?.label ?? c.kind },
            { label: 'Value', value: c.valuePaise ? formatMoney(c.valuePaise, c.currency) : '—' },
            { label: 'Term', value: `${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}` },
            { label: 'Auto-renews', value: c.autoRenew ? `Yes — ${c.renewalNoticeDays} days’ notice` : 'No' },
            { label: 'Signed', value: c.signedAt ? `${fmtDateTime(c.signedAt)}${c.signedBy ? ` by ${c.signedBy}` : ''}` : 'Not yet signed' },
            ...(project ? [{ label: 'Project', value: <Link className="text-brand hover:underline" href={`/portal/projects/${project.id}`}>{project.name}</Link> }] : []),
            ...(viewer.isInternal && c.notes ? [{ label: 'Internal notes', value: c.notes }] : []),
          ]}
        />
      </Panel>
      {manage && (
        <Panel className="mt-6" title="Edit contract">
          <ContractForm
            clients={clientRows}
            projects={projectRows}
            documents={docRows.filter((d): d is { id: string; name: string; clientId: string } => Boolean(d.clientId))}
            initial={{ id: c.id, title: c.title, kind: c.kind, clientId: c.clientId, projectId: c.projectId, documentId: c.documentId, status: c.status, currency: c.currency, value: c.valuePaise ? String(c.valuePaise / 100) : '', startDate: c.startDate, endDate: c.endDate, autoRenew: c.autoRenew, renewalNoticeDays: c.renewalNoticeDays, signedBy: c.signedBy, notes: c.notes }}
          />
        </Panel>
      )}
    </>
  );
}
