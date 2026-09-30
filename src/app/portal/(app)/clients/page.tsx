import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { Building2, Search } from 'lucide-react';
import { db } from '@/server/db';
import { clients, users } from '@/server/db/schema';
import { can, requirePermission } from '@/server/auth/viewer';
import { clientScope } from '@/server/scope';
import { internalPeople } from '@/server/queries/people';
import { EmptyState, PageHeader, Panel, StatusBadge, Table, Td, Th, Tr } from '@/components/portal/ui';
import { NewClientButton } from '@/components/portal/clients/ClientDialogs';
import { formatINR } from '@/lib/portal/invoice-math';
import { inputClass } from '@/components/portal/forms';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Clients' };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const viewer = await requirePermission('clients.view');
  const { q = '', status = '' } = await searchParams;
  const term = q.trim().slice(0, 80);
  const statusFilter = ['active', 'inactive', 'onboarding'].includes(status) ? (status as 'active') : null;
  const finance = can(viewer, 'invoices.view');

  const rows = await db
    .select({
      id: clients.id,
      code: clients.code,
      companyName: clients.companyName,
      contactName: clients.contactName,
      email: clients.email,
      city: clients.city,
      status: clients.status,
      manager: users.name,
      projects: sql<number>`(select count(*)::int from projects p where p.client_id = ${clients.id} and p.status not in ('completed','cancelled'))`,
      outstanding: sql<number>`(select coalesce(sum(i.total_paise - i.paid_paise), 0)::bigint from invoices i where i.client_id = ${clients.id} and i.status in ('sent','partially_paid','overdue'))`,
      logins: sql<number>`(select count(*)::int from client_users cu where cu.client_id = ${clients.id})`,
    })
    .from(clients)
    .leftJoin(users, eq(users.id, clients.accountManagerId))
    .where(
      and(
        clientScope(viewer),
        statusFilter ? eq(clients.status, statusFilter) : undefined,
        term ? or(ilike(clients.companyName, `%${term}%`), ilike(clients.contactName, `%${term}%`), ilike(clients.email, `%${term}%`), ilike(clients.code, `%${term}%`)) : undefined
      )
    )
    .orderBy(asc(clients.companyName));

  const managers = can(viewer, 'clients.manage') ? await internalPeople(viewer) : [];
  const filters = [
    { key: '', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'inactive', label: 'Inactive' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Business"
        title="Clients"
        description="Every client is a fully isolated account — their users only ever see their own data."
        actions={can(viewer, 'clients.manage') ? <NewClientButton managers={managers} /> : null}
      />
      <Panel>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {filters.map((f) => (
              <Link
                key={f.key}
                href={`/portal/clients?${new URLSearchParams({ ...(term ? { q: term } : {}), ...(f.key ? { status: f.key } : {}) })}`}
                className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', status === f.key ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-50')}
              >
                {f.label}
              </Link>
            ))}
          </div>
          <form className="relative sm:w-72">
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={term} placeholder="Search clients" className={cn(inputClass, 'py-2 pl-9')} />
          </form>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Building2} title="No clients found" description={term ? 'Try a different search.' : 'Add your first client to get started.'} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Primary contact</Th>
                <Th>Account manager</Th>
                <Th className="text-right">Live projects</Th>
                {finance && <Th className="text-right">Outstanding</Th>}
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <Link href={`/portal/clients/${c.id}`} className="group flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-xs font-bold text-brand">
                        {c.companyName.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 group-hover:text-brand">{c.companyName}</span>
                        <span className="block text-xs text-slate-500">
                          {c.code}
                          {c.city ? ` · ${c.city}` : ''} · {c.logins} {c.logins === 1 ? 'login' : 'logins'}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <span className="block text-slate-800">{c.contactName}</span>
                    <span className="block text-xs text-slate-500">{c.email}</span>
                  </Td>
                  <Td>{c.manager ?? <span className="text-slate-400">Unassigned</span>}</Td>
                  <Td className="text-right tabular-nums">{c.projects}</Td>
                  {finance && <Td className={cn('text-right font-semibold tabular-nums', Number(c.outstanding) > 0 ? 'text-slate-900' : 'text-slate-400')}>{formatINR(Number(c.outstanding))}</Td>}
                  <Td>
                    <StatusBadge status={c.status} />
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
