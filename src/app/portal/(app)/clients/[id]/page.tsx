import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq } from 'drizzle-orm';
import { Bell, CalendarPlus, FilePlus2, FolderPlus, Globe, LifeBuoy, Mail, MapPin, Phone, ReceiptIndianRupee, StickyNote } from 'lucide-react';
import { db } from '@/server/db';
import { activities, clientNotes, clientUsers, clients, documents, invoices, meetings, payments, projects, tickets, users } from '@/server/db/schema';
import { can, requirePermission } from '@/server/auth/viewer';
import { activityScope, clientScope, documentScope, invoiceScope, isUuid, meetingScope, paymentScope, projectScope, ticketScope } from '@/server/scope';
import { internalPeople } from '@/server/queries/people';
import { projectProgress } from '@/server/queries/common';
import { Avatar, Badge, EmptyState, KeyValue, PageHeader, Panel, ProgressBar, StatCard, StatusBadge, Table, Tabs, Td, Th, Timeline, Tr } from '@/components/portal/ui';
import { AddClientLoginButton, EditClientButton, UserAccessControls } from '@/components/portal/clients/ClientDialogs';
import { NoteForm } from '@/components/portal/clients/NoteForm';
import { deriveInvoiceStatus, formatINR } from '@/lib/portal/invoice-math';
import { fmtDate, fmtDateTime, humanize, relativeTime } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Client' };

const TABS = ['overview', 'projects', 'invoices', 'payments', 'documents', 'tickets', 'meetings', 'users', 'notes', 'activity'] as const;
type Tab = (typeof TABS)[number];

export default async function ClientProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const viewer = await requirePermission('clients.view');
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  if (!isUuid(id)) notFound();
  const [client] = await db.select().from(clients).where(and(eq(clients.id, id), clientScope(viewer)));
  if (!client) notFound();

  const finance = can(viewer, 'invoices.view');
  const manage = can(viewer, 'clients.manage');
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? '') ? (rawTab as Tab) : 'overview';

  const [projectRows, invoiceRows, paymentRows, docRows, ticketRows, meetingRows, logins, notes, activity, manager] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.clientId, id), projectScope(viewer))).orderBy(desc(projects.createdAt)),
    finance ? db.select().from(invoices).where(and(eq(invoices.clientId, id), invoiceScope(viewer))).orderBy(desc(invoices.issueDate)) : Promise.resolve([]),
    finance
      ? db
          .select({ p: payments, number: invoices.number, by: users.name })
          .from(payments)
          .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
          .leftJoin(users, eq(users.id, payments.recordedBy))
          .where(and(eq(payments.clientId, id), paymentScope(viewer)))
          .orderBy(desc(payments.paidOn))
      : Promise.resolve([]),
    db.select().from(documents).where(and(eq(documents.clientId, id), documentScope(viewer))).orderBy(desc(documents.updatedAt)),
    db.select().from(tickets).where(and(eq(tickets.clientId, id), ticketScope(viewer))).orderBy(desc(tickets.lastActivityAt)),
    db.select().from(meetings).where(and(eq(meetings.clientId, id), meetingScope(viewer))).orderBy(desc(meetings.startsAt)),
    db
      .select({ id: users.id, name: users.name, email: users.email, title: users.title, isActive: users.isActive, lastLoginAt: users.lastLoginAt, role: clientUsers.role, hasPassword: users.passwordHash })
      .from(clientUsers)
      .innerJoin(users, eq(users.id, clientUsers.userId))
      .where(eq(clientUsers.clientId, id))
      .orderBy(asc(users.name)),
    db.select({ n: clientNotes, author: users.name }).from(clientNotes).leftJoin(users, eq(users.id, clientNotes.authorId)).where(eq(clientNotes.clientId, id)).orderBy(desc(clientNotes.createdAt)),
    db
      .select({ a: activities, actor: users.name })
      .from(activities)
      .leftJoin(users, eq(users.id, activities.actorId))
      .where(and(eq(activities.clientId, id), activityScope(viewer)))
      .orderBy(desc(activities.createdAt))
      .limit(100),
    client.accountManagerId ? db.select({ name: users.name }).from(users).where(eq(users.id, client.accountManagerId)) : Promise.resolve([]),
  ]);
  const progress = await projectProgress(projectRows.map((p) => p.id));
  const managers = manage ? await internalPeople(viewer) : [];

  const billed = invoiceRows.filter((i) => i.status !== 'draft' && i.status !== 'cancelled');
  const lifetimeBilled = billed.reduce((s, i) => s + i.totalPaise, 0);
  const lifetimePaid = paymentRows.reduce((s, r) => s + r.p.amountPaise, 0);
  const due = billed.reduce((s, i) => s + Math.max(0, i.totalPaise - i.paidPaise), 0);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'projects', label: 'Projects', count: projectRows.length },
    ...(finance ? [{ key: 'invoices', label: 'Invoices', count: invoiceRows.length }, { key: 'payments', label: 'Payments', count: paymentRows.length }] : []),
    { key: 'documents', label: 'Documents', count: docRows.length },
    { key: 'tickets', label: 'Tickets', count: ticketRows.length },
    { key: 'meetings', label: 'Meetings', count: meetingRows.length },
    { key: 'users', label: 'Portal logins', count: logins.length },
    { key: 'notes', label: 'Notes', count: notes.length },
    { key: 'activity', label: 'Activity' },
  ].map((t) => ({ ...t, href: `/portal/clients/${id}${t.key === 'overview' ? '' : `?tab=${t.key}`}` }));

  const address = [client.addressLine1, client.addressLine2, [client.city, client.state, client.postalCode].filter(Boolean).join(', '), client.country].filter(Boolean).join('\n');

  return (
    <>
      <PageHeader
        eyebrow={`${client.code} · Client`}
        title={client.companyName}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={client.status} />
            {client.industry && <span>{client.industry}</span>}
            {manager[0] && <span>· Managed by {manager[0].name}</span>}
          </span>
        }
        actions={manage ? <EditClientButton initial={client} managers={managers} /> : null}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {can(viewer, 'projects.manage') && <QuickAction href={`/portal/projects?new=1&client=${id}`} icon={FolderPlus} label="New project" />}
        {can(viewer, 'invoices.manage') && <QuickAction href={`/portal/invoices/new?client=${id}`} icon={ReceiptIndianRupee} label="Create invoice" />}
        <QuickAction href={`/portal/meetings?new=1&client=${id}`} icon={CalendarPlus} label="Schedule meeting" />
        <QuickAction href={`/portal/tickets?new=1&client=${id}`} icon={LifeBuoy} label="New ticket" />
        <QuickAction href={`/portal/documents?upload=1&client=${id}`} icon={FilePlus2} label="Upload document" />
        {can(viewer, 'notifications.send') && <QuickAction href={`/portal/announcements?client=${id}`} icon={Bell} label="Send notification" />}
      </div>

      <Tabs tabs={tabs} active={tab} />

      {tab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            {finance && (
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Lifetime billed" value={formatINR(lifetimeBilled, { compact: true })} icon={ReceiptIndianRupee} />
                <StatCard label="Lifetime paid" value={formatINR(lifetimePaid, { compact: true })} icon={ReceiptIndianRupee} tone="green" />
                <StatCard label="Amount due" value={formatINR(due, { compact: true })} icon={ReceiptIndianRupee} tone={due ? 'amber' : 'slate'} />
              </div>
            )}
            <Panel title="Company details">
              <KeyValue
                items={[
                  { label: 'Legal name', value: client.legalName },
                  { label: 'GSTIN', value: client.gstin ? <span className="font-mono">{client.gstin}</span> : null },
                  { label: 'PAN', value: client.pan },
                  { label: 'Website', value: client.website },
                  { label: 'Billing address', value: <span className="whitespace-pre-line">{address}</span> },
                  { label: 'Client since', value: fmtDate(client.createdAt) },
                ]}
              />
            </Panel>
            <Panel title="Projects" action={<Link href={`?tab=projects`} className="text-xs font-semibold text-brand">View all</Link>}>
              <ProjectRows rows={projectRows.slice(0, 4)} progress={progress} />
            </Panel>
          </div>
          <div className="space-y-6">
            <Panel title="Primary contact">
              <div className="flex items-center gap-3">
                <Avatar name={client.contactName} size="lg" />
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="font-semibold text-slate-900">{client.contactName}</p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Mail className="h-3.5 w-3.5" /> {client.email}
                  </p>
                  {client.phone && (
                    <p className="flex items-center gap-1.5 text-slate-600">
                      <Phone className="h-3.5 w-3.5" /> {client.phone}
                    </p>
                  )}
                  {client.city && (
                    <p className="flex items-center gap-1.5 text-slate-600">
                      <MapPin className="h-3.5 w-3.5" /> {client.city}
                    </p>
                  )}
                  {client.website && (
                    <p className="flex items-center gap-1.5 text-slate-600">
                      <Globe className="h-3.5 w-3.5" /> {client.website}
                    </p>
                  )}
                </div>
              </div>
            </Panel>
            <Panel title="Recent activity">
              <Timeline items={activity.slice(0, 6).map((r) => ({ id: r.a.id, title: r.a.summary, meta: `${r.actor ?? 'System'} · ${relativeTime(r.a.createdAt)}` }))} />
            </Panel>
          </div>
        </div>
      )}

      {tab === 'projects' && (
        <Panel>
          <ProjectRows rows={projectRows} progress={progress} />
        </Panel>
      )}

      {tab === 'invoices' && finance && (
        <Panel>
          {invoiceRows.length === 0 ? (
            <EmptyState icon={ReceiptIndianRupee} title="No invoices yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Issued</Th>
                  <Th>Due</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Paid</Th>
                  <Th className="text-right">Due amount</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((i) => (
                  <Tr key={i.id}>
                    <Td>
                      <Link href={`/portal/invoices/${i.id}`} className="font-semibold text-slate-900 hover:text-brand">
                        {i.number}
                      </Link>
                    </Td>
                    <Td>{fmtDate(i.issueDate)}</Td>
                    <Td>{fmtDate(i.dueDate)}</Td>
                    <Td className="text-right tabular-nums">{formatINR(i.totalPaise)}</Td>
                    <Td className="text-right tabular-nums">{formatINR(i.paidPaise)}</Td>
                    <Td className="text-right font-semibold tabular-nums">{formatINR(Math.max(0, i.totalPaise - i.paidPaise))}</Td>
                    <Td>
                      <StatusBadge status={deriveInvoiceStatus(i)} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      )}

      {tab === 'payments' && finance && (
        <Panel title="Payment history" description={`Complete lifetime record · ${formatINR(lifetimePaid)} received`}>
          {paymentRows.length === 0 ? (
            <EmptyState icon={ReceiptIndianRupee} title="No payments recorded" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Invoice</Th>
                  <Th>Method</Th>
                  <Th>Reference</Th>
                  <Th>Recorded by</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.map(({ p, number, by }) => (
                  <Tr key={p.id}>
                    <Td>{fmtDate(p.paidOn)}</Td>
                    <Td>
                      <Link href={`/portal/invoices/${p.invoiceId}`} className="font-medium hover:text-brand">
                        {number}
                      </Link>
                    </Td>
                    <Td>{humanize(p.method)}</Td>
                    <Td className="font-mono text-xs">{p.reference ?? '—'}</Td>
                    <Td>{by ?? '—'}</Td>
                    <Td className="text-right font-semibold tabular-nums text-emerald-700">{formatINR(p.amountPaise)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      )}

      {tab === 'documents' && (
        <Panel action={<Link href={`/portal/documents?client=${id}`} className="text-xs font-semibold text-brand">Open in documents</Link>}>
          {docRows.length === 0 ? (
            <EmptyState icon={FilePlus2} title="No documents" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {docRows.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/portal/documents?doc=${d.id}`} className="min-w-0 truncate text-sm font-medium text-slate-900 hover:text-brand">
                    {d.name}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                    <Badge tone={d.visibility === 'client' ? 'brand' : 'slate'}>{d.visibility === 'client' ? 'Shared with client' : 'Internal'}</Badge>v{d.currentVersion} · {fmtDate(d.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'tickets' && (
        <Panel>
          {ticketRows.length === 0 ? (
            <EmptyState icon={LifeBuoy} title="No tickets" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {ticketRows.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/portal/tickets/${t.id}`} className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900 hover:text-brand">{t.subject}</span>
                    <span className="block text-xs text-slate-500">
                      {t.number} · {relativeTime(t.lastActivityAt)}
                    </span>
                  </Link>
                  <span className="flex gap-2">
                    <StatusBadge status={t.priority} />
                    <StatusBadge status={t.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'meetings' && (
        <Panel>
          {meetingRows.length === 0 ? (
            <EmptyState icon={CalendarPlus} title="No meetings" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {meetingRows.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/portal/meetings/${m.id}`} className="min-w-0 text-sm font-medium text-slate-900 hover:text-brand">
                    {m.title}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                    {fmtDateTime(m.startsAt)} <StatusBadge status={m.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'users' && (
        <Panel title="Portal logins" description="People at this client who can sign in. They see only this account." action={manage ? <AddClientLoginButton clientId={id} /> : null}>
          {logins.length === 0 ? (
            <EmptyState icon={Mail} title="No logins yet" description="Create a login to give this client access to their portal." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {logins.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {u.name} <span className="font-normal text-slate-500">· {u.title ?? 'Contact'}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {u.email} · {u.lastLoginAt ? `last sign-in ${relativeTime(u.lastLoginAt)}` : u.hasPassword ? 'never signed in' : 'invitation pending'}
                    </p>
                  </div>
                  <Badge tone={u.role === 'owner' ? 'brand' : 'slate'}>{humanize(u.role)}</Badge>
                  {!u.isActive && <Badge tone="red">Deactivated</Badge>}
                  <UserAccessControls userId={u.id} isActive={u.isActive} canManage={manage} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'notes' && (
        <Panel title="Internal notes" description="Never visible to the client.">
          <NoteForm clientId={id} />
          <ul className="mt-5 space-y-3">
            {notes.map(({ n, author }) => (
              <li key={n.id} className="rounded-xl border border-gray-100 bg-slate-50/60 p-3">
                <p className="whitespace-pre-wrap text-sm text-slate-800">{n.body}</p>
                <p className="mt-1.5 text-xs text-slate-500">
                  {author ?? 'Unknown'} · {fmtDateTime(n.createdAt)}
                </p>
              </li>
            ))}
            {notes.length === 0 && (
              <li className="flex items-center gap-2 text-sm text-slate-500">
                <StickyNote className="h-4 w-4" /> No notes yet.
              </li>
            )}
          </ul>
        </Panel>
      )}

      {tab === 'activity' && (
        <Panel title="Complete activity history">
          <Timeline
            items={activity.map((r) => ({
              id: r.a.id,
              title: r.a.summary,
              meta: `${r.actor ?? 'System'} · ${fmtDateTime(r.a.createdAt)}${r.a.visibility === 'client' ? ' · visible to client' : ''}`,
              tone: r.a.visibility === 'client' ? 'brand' : 'slate',
            }))}
          />
        </Panel>
      )}
    </>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof Bell; label: string }) {
  return (
    <Link href={href} className="card-hover inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand">
      <Icon className="card-accent h-4 w-4 text-slate-400" strokeWidth={1.75} /> {label}
    </Link>
  );
}

function ProjectRows({ rows, progress }: { rows: (typeof projects.$inferSelect)[]; progress: Map<string, { pct: number; done: number; total: number }> }) {
  if (rows.length === 0) return <EmptyState icon={FolderPlus} title="No projects yet" />;
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((p) => (
        <li key={p.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_200px_auto] sm:items-center">
          <Link href={`/portal/projects/${p.id}`} className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900 hover:text-brand">{p.name}</span>
            <span className="block text-xs text-slate-500">
              {p.code} · {fmtDate(p.startDate, 'short')} → {fmtDate(p.dueDate, 'short')}
            </span>
          </Link>
          <ProgressBar value={progress.get(p.id)?.pct ?? 0} />
          <StatusBadge status={p.status} />
        </li>
      ))}
    </ul>
  );
}
