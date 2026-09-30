import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { and, desc, eq, isNull, ne } from 'drizzle-orm';
import { ArrowRight, GitPullRequestArrow } from 'lucide-react';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/server/db';
import { changeRequests, clients, documents, invoices, projects, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { changeRequestScope } from '@/server/scope';
import { EmptyState, PageHeader, Panel, StatusBadge } from '@/components/portal/ui';
import { ChangeRequestForm, ReviewChangeForm, type ChangeTarget } from '@/components/portal/changes/ChangeRequestForms';
import { CHANGEABLE, ENTITY_LABELS } from '@/lib/portal/change-requests';
import { fmtDateTime } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Change requests' };

const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'Remove' : 'Keep') : String(v));

export default async function ChangeRequestsPage({ searchParams }: { searchParams: Promise<{ entity?: string; id?: string }> }) {
  const viewer = await requireViewer();
  const reviewer = can(viewer, 'change_requests.review');
  if (viewer.isInternal && !reviewer) notFound();
  const sp = await searchParams;

  const requester = alias(users, 'requester');
  const reviewerUser = alias(users, 'reviewer');
  const rows = await db
    .select({ cr: changeRequests, clientName: clients.companyName, requester: requester.name, reviewer: reviewerUser.name })
    .from(changeRequests)
    .innerJoin(clients, eq(clients.id, changeRequests.clientId))
    .leftJoin(requester, eq(requester.id, changeRequests.requestedBy))
    .leftJoin(reviewerUser, eq(reviewerUser.id, changeRequests.reviewedBy))
    .where(changeRequestScope(viewer))
    .orderBy(desc(changeRequests.createdAt))
    .limit(200);
  const pending = rows.filter((r) => r.cr.status === 'pending');
  const history = rows.filter((r) => r.cr.status !== 'pending');

  // Everything a client may request changes to — only their own records.
  let targets: ChangeTarget[] = [];
  if (!viewer.isInternal && viewer.clientId) {
    const [client] = await db.select().from(clients).where(eq(clients.id, viewer.clientId));
    const [invs, projs, docs] = await Promise.all([
      db.select().from(invoices).where(and(eq(invoices.clientId, viewer.clientId), ne(invoices.status, 'draft'))).orderBy(desc(invoices.issueDate)),
      db.select().from(projects).where(eq(projects.clientId, viewer.clientId)),
      db.select().from(documents).where(and(eq(documents.clientId, viewer.clientId), eq(documents.visibility, 'client'), isNull(documents.deletedAt))),
    ]);
    const fields = <T extends Record<string, unknown>>(entity: keyof typeof CHANGEABLE, row: T) =>
      Object.entries(CHANGEABLE[entity]).map(([field, label]) => ({ field, label, current: field === 'delete' ? '' : show(row[field]).replace(/^—$/, '') }));
    targets = [
      { key: `client:${client.id}`, entityType: 'client', entityId: client.id, label: `${ENTITY_LABELS.client} — ${client.companyName}`, fields: fields('client', client) },
      ...invs.map((i) => ({ key: `invoice:${i.id}`, entityType: 'invoice' as const, entityId: i.id, label: `Invoice ${i.number}`, fields: fields('invoice', i) })),
      ...projs.map((p) => ({ key: `project:${p.id}`, entityType: 'project' as const, entityId: p.id, label: `Project — ${p.name}`, fields: fields('project', p) })),
      ...docs.map((d) => ({ key: `document:${d.id}`, entityType: 'document' as const, entityId: d.id, label: `Document — ${d.name}`, fields: fields('document', d) })),
    ];
  }
  const defaultKey = sp.entity && sp.id ? `${sp.entity}:${sp.id}` : undefined;

  const card = (r: (typeof rows)[number], withReview: boolean) => {
    const label = CHANGEABLE[r.cr.entityType as keyof typeof CHANGEABLE]?.[r.cr.field] ?? r.cr.field;
    return (
      <li key={r.cr.id} className="rounded-xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">
            {ENTITY_LABELS[r.cr.entityType as keyof typeof ENTITY_LABELS] ?? r.cr.entityType} · {label}
          </p>
          <StatusBadge status={r.cr.status} />
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {viewer.isInternal ? `${r.clientName} · ` : ''}Requested by {r.requester ?? '—'} · {fmtDateTime(r.cr.createdAt)}
        </p>
        <div className="mt-3 grid items-center gap-2 text-sm sm:grid-cols-[1fr_auto_1fr]">
          <p className="whitespace-pre-wrap rounded-lg bg-rose-50/60 px-3 py-2 text-slate-600 line-through decoration-rose-300">{show(r.cr.oldValue)}</p>
          <ArrowRight className="mx-auto hidden h-4 w-4 text-slate-400 sm:block" />
          <p className="whitespace-pre-wrap rounded-lg bg-emerald-50/70 px-3 py-2 font-medium text-slate-900">{show(r.cr.newValue)}</p>
        </div>
        {r.cr.reason && <p className="mt-2 text-xs text-slate-600">Reason: “{r.cr.reason}”</p>}
        {r.cr.reviewedAt && (
          <p className="mt-2 text-xs text-slate-500">
            {r.cr.status === 'approved' ? 'Approved' : 'Rejected'} by {r.reviewer ?? '—'} · {fmtDateTime(r.cr.reviewedAt)}
            {r.cr.reviewNote ? ` · “${r.cr.reviewNote}”` : ''}
          </p>
        )}
        {withReview && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <ReviewChangeForm id={r.cr.id} />
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Change requests"
        description={viewer.isInternal ? 'Client-requested changes to sensitive information. Nothing changes until approved, and every decision is audited.' : 'Sensitive details like billing, legal information and key documents are updated after review by Isha Technologies.'}
      />
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          {!viewer.isInternal && (
            <Panel title="Request a change">
              {targets.length ? <ChangeRequestForm targets={targets} defaultKey={defaultKey} /> : <p className="text-sm text-slate-500">Nothing to change yet.</p>}
            </Panel>
          )}
          {reviewer && (
            <Panel title="Awaiting review" description={`${pending.length} pending`}>
              {pending.length === 0 ? <EmptyState icon={GitPullRequestArrow} title="No pending requests" /> : <ul className="space-y-3">{pending.map((r) => card(r, true))}</ul>}
            </Panel>
          )}
          {!viewer.isInternal && pending.length > 0 && (
            <Panel title="Pending">
              <ul className="space-y-3">{pending.map((r) => card(r, false))}</ul>
            </Panel>
          )}
        </div>
        <div className="xl:col-span-2">
          <Panel title="History" description="Complete audit trail">
            {history.length === 0 ? <p className="text-sm text-slate-500">No reviewed requests yet.</p> : <ul className="space-y-3">{history.map((r) => card(r, false))}</ul>}
          </Panel>
        </div>
      </div>
    </>
  );
}
