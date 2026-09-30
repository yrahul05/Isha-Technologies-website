import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq } from 'drizzle-orm';
import { ArrowLeft, Lock } from 'lucide-react';
import { db } from '@/server/db';
import { clients, documents, projects, ticketComments, tickets, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { documentScope, isProjectMember, isUuid, ticketScope } from '@/server/scope';
import { internalPeople } from '@/server/queries/people';
import { Avatar, Badge, KeyValue, PageHeader, Panel, StatusBadge } from '@/components/portal/ui';
import { ClientTicketButtons, TicketControls, TicketReply } from '@/components/portal/tickets/TicketForms';
import { DocumentRowList } from '@/components/portal/documents/DocumentRowList';
import { UploadButton } from '@/components/portal/documents/Uploader';
import { fmtDateTime, humanize, relativeTime } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Ticket' };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [row] = await db
    .select({ t: tickets, clientName: clients.companyName, projectName: projects.name, creator: users.name })
    .from(tickets)
    .innerJoin(clients, eq(clients.id, tickets.clientId))
    .leftJoin(projects, eq(projects.id, tickets.projectId))
    .leftJoin(users, eq(users.id, tickets.createdBy))
    .where(and(eq(tickets.id, id), ticketScope(viewer)));
  if (!row) notFound();
  const { t } = row;

  const [thread, attachments] = await Promise.all([
    db
      .select({ c: ticketComments, author: users.name, role: users.role })
      .from(ticketComments)
      .leftJoin(users, eq(users.id, ticketComments.authorId))
      // Internal notes are removed in SQL for clients.
      .where(and(eq(ticketComments.ticketId, id), viewer.isInternal ? undefined : eq(ticketComments.isInternal, false)))
      .orderBy(asc(ticketComments.createdAt)),
    db.select().from(documents).where(and(eq(documents.ticketId, id), documentScope(viewer))).orderBy(desc(documents.createdAt)),
  ]);
  const canWork = viewer.isInternal && (can(viewer, 'tickets.manage') || t.assigneeId === viewer.id || (t.projectId ? await isProjectMember(viewer, t.projectId) : false));
  const people = canWork ? await internalPeople(viewer) : [];
  const assignee = people.find((p) => p.id === t.assigneeId)?.name;

  return (
    <>
      <Link href="/portal/tickets" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand">
        <ArrowLeft className="h-3.5 w-3.5" /> All tickets
      </Link>
      <PageHeader
        eyebrow={`${t.number}${viewer.isInternal ? ` · ${row.clientName}` : ''}`}
        title={t.subject}
        description={
          <span className="inline-flex flex-wrap gap-2">
            <StatusBadge status={t.status} />
            <StatusBadge status={t.priority} />
            <Badge tone="slate">{humanize(t.category)}</Badge>
          </span>
        }
        actions={!viewer.isInternal ? <ClientTicketButtons ticketId={t.id} status={t.status} /> : null}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel>
            <ol className="space-y-5">
              <li className="flex gap-3">
                <Avatar name={row.creator ?? '?'} size="sm" />
                <div className="min-w-0 flex-1 rounded-xl border border-brand/15 bg-brand/[0.03] p-4">
                  <p className="text-xs">
                    <span className="font-semibold text-slate-900">{row.creator ?? 'Former user'}</span> <span className="text-slate-400">opened this ticket · {fmtDateTime(t.createdAt)}</span>
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{t.description}</p>
                </div>
              </li>
              {thread.map(({ c, author, role }) => (
                <li key={c.id} className="flex gap-3">
                  <Avatar name={author ?? '?'} size="sm" />
                  <div className={c.isInternal ? 'min-w-0 flex-1 rounded-xl border border-amber-200 bg-amber-50/60 p-4' : 'min-w-0 flex-1 rounded-xl border border-gray-100 bg-slate-50/60 p-4'}>
                    <p className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-900">{author ?? 'Former user'}</span>
                      {role && role !== 'client' && <Badge tone="brand">Isha Technologies</Badge>}
                      {c.isInternal && (
                        <Badge tone="amber">
                          <Lock className="h-3 w-3" /> Internal note
                        </Badge>
                      )}
                      <span className="text-slate-400">{relativeTime(c.createdAt)}</span>
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{c.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            {(canWork || !viewer.isInternal) && (t.status !== 'closed' || viewer.isInternal) && (
              <div className="mt-6 border-t border-gray-100 pt-5">
                <TicketReply ticketId={t.id} isInternal={viewer.isInternal} />
              </div>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Details">
            {canWork ? (
              <TicketControls ticket={{ id: t.id, status: t.status, priority: t.priority, category: t.category, assigneeId: t.assigneeId }} people={people} canReassign={can(viewer, 'tickets.manage')} />
            ) : (
              <KeyValue
                items={[
                  { label: 'Project', value: row.projectName },
                  { label: 'Assigned to', value: assignee ?? (t.assigneeId ? 'Isha Technologies team' : 'Being triaged') },
                  { label: 'Opened', value: fmtDateTime(t.createdAt) },
                  { label: 'Last update', value: relativeTime(t.lastActivityAt) },
                ]}
              />
            )}
          </Panel>
          <Panel title="Attachments" action={t.status !== 'closed' ? <UploadButton target={{ ticketId: t.id }} label="Attach" compact /> : null}>
            {attachments.length ? <DocumentRowList docs={attachments} showVisibility={false} /> : <p className="text-sm text-slate-500">No attachments.</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
