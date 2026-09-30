import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { AlarmClock, CircleDollarSign, Download, ReceiptIndianRupee, Wallet } from 'lucide-react';
import { db } from '@/server/db';
import { clients, invoices, payments } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { invoiceScope, paymentScope } from '@/server/scope';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, Table, Td, Th, Tr } from '@/components/portal/ui';
import { deriveInvoiceStatus, formatINR } from '@/lib/portal/invoice-math';
import { fmtDate, humanize } from '@/lib/portal/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Invoices' };

const FILTERS = ['all', 'outstanding', 'overdue', 'paid', 'draft', 'cancelled'] as const;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const viewer = await requireViewer();
  // Employees without finance access have no invoice area at all.
  if (viewer.isInternal && !can(viewer, 'invoices.view')) notFound();
  const { status: rawStatus } = await searchParams;
  const filter = FILTERS.find((f) => f === rawStatus) ?? 'all';

  const [rows, paymentRows] = await Promise.all([
    db
      .select({ inv: invoices, clientName: clients.companyName })
      .from(invoices)
      .innerJoin(clients, eq(clients.id, invoices.clientId))
      .where(invoiceScope(viewer))
      .orderBy(desc(invoices.issueDate), desc(invoices.number)),
    db
      .select({ p: payments, number: invoices.number, clientName: clients.companyName })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .innerJoin(clients, eq(clients.id, payments.clientId))
      .where(and(paymentScope(viewer)))
      .orderBy(desc(payments.paidOn)),
  ]);

  const withStatus = rows.map((r) => ({ ...r, status: deriveInvoiceStatus(r.inv) }));
  const issued = withStatus.filter((r) => r.status !== 'draft' && r.status !== 'cancelled');
  const billed = issued.reduce((s, r) => s + r.inv.totalPaise, 0);
  const collected = paymentRows.reduce((s, r) => s + r.p.amountPaise, 0);
  const outstanding = issued.reduce((s, r) => s + Math.max(0, r.inv.totalPaise - r.inv.paidPaise), 0);
  const overdue = issued.filter((r) => r.status === 'overdue').reduce((s, r) => s + (r.inv.totalPaise - r.inv.paidPaise), 0);

  const visible = withStatus.filter((r) =>
    filter === 'all' ? true : filter === 'outstanding' ? ['sent', 'partially_paid', 'overdue'].includes(r.status) : r.status === filter
  );

  // Lifetime history grouped by year (clients especially want this view).
  const byYear = new Map<string, typeof visible>();
  for (const r of visible) byYear.set(r.inv.issueDate.slice(0, 4), [...(byYear.get(r.inv.issueDate.slice(0, 4)) ?? []), r]);

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title={viewer.isInternal ? 'Invoices & payments' : 'Invoices & payment history'}
        description={viewer.isInternal ? 'Every invoice and payment, for the lifetime of each client.' : 'Your complete billing history with Isha Technologies, from the very first invoice.'}
        actions={
          can(viewer, 'invoices.manage') ? (
            <Button asChild variant="primary" className="h-10 rounded-lg px-4 text-sm">
              <Link href="/portal/invoices/new">Create invoice</Link>
            </Button>
          ) : null
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={viewer.isInternal ? 'Total billed' : 'Lifetime billed'} value={formatINR(billed, { compact: true })} icon={ReceiptIndianRupee} />
        <StatCard label={viewer.isInternal ? 'Collected' : 'Paid to date'} value={formatINR(collected, { compact: true })} icon={CircleDollarSign} tone="green" />
        <StatCard label="Outstanding" value={formatINR(outstanding, { compact: true })} icon={Wallet} tone={outstanding ? 'amber' : 'slate'} href="/portal/invoices?status=outstanding" />
        <StatCard label="Overdue" value={formatINR(overdue, { compact: true })} icon={AlarmClock} tone={overdue ? 'red' : 'slate'} href="/portal/invoices?status=overdue" />
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto">
        {FILTERS.filter((f) => viewer.isInternal || (f !== 'draft' && f !== 'cancelled')).map((f) => (
          <Link key={f} href={`/portal/invoices${f === 'all' ? '' : `?status=${f}`}`} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', filter === f ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-50')}>
            {humanize(f)}
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <Panel>
          <EmptyState icon={ReceiptIndianRupee} title="No invoices" />
        </Panel>
      ) : (
        <div className="space-y-6">
          {[...byYear.entries()].map(([year, list]) => {
            const yb = list.filter((r) => r.status !== 'draft' && r.status !== 'cancelled');
            const yTotal = yb.reduce((s, r) => s + r.inv.totalPaise, 0);
            const yPaid = yb.reduce((s, r) => s + r.inv.paidPaise, 0);
            return (
              <Panel
                key={year}
                title={year}
                description={`${list.length} ${list.length === 1 ? 'invoice' : 'invoices'} · billed ${formatINR(yTotal)} · paid ${formatINR(yPaid)} · due ${formatINR(yTotal - yPaid)}`}
              >
                <Table>
                  <thead>
                    <tr>
                      <Th>Invoice</Th>
                      {viewer.isInternal && <Th>Client</Th>}
                      <Th>Issued</Th>
                      <Th>Due</Th>
                      <Th className="text-right">Amount</Th>
                      <Th className="text-right">Paid</Th>
                      <Th className="text-right">Due amount</Th>
                      <Th>Status</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(({ inv, clientName, status }) => (
                      <Tr key={inv.id}>
                        <Td>
                          <Link href={`/portal/invoices/${inv.id}`} className="font-semibold text-slate-900 hover:text-brand">
                            {inv.number}
                          </Link>
                        </Td>
                        {viewer.isInternal && <Td>{clientName}</Td>}
                        <Td>{fmtDate(inv.issueDate)}</Td>
                        <Td>{fmtDate(inv.dueDate)}</Td>
                        <Td className="text-right tabular-nums">{formatINR(inv.totalPaise)}</Td>
                        <Td className="text-right tabular-nums text-emerald-700">{formatINR(inv.paidPaise)}</Td>
                        <Td className="text-right font-semibold tabular-nums">{formatINR(Math.max(0, inv.totalPaise - inv.paidPaise))}</Td>
                        <Td>
                          <StatusBadge status={status} />
                        </Td>
                        <Td>
                          {status !== 'draft' && (
                            <a href={`/api/portal/invoices/${inv.id}/pdf`} aria-label={`Download ${inv.number} PDF`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-slate-500 hover:border-brand hover:text-brand">
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Panel>
            );
          })}
        </div>
      )}

      <Panel className="mt-6" title="Payment history" description={`${paymentRows.length} payments · ${formatINR(collected)} received`}>
        {paymentRows.length === 0 ? (
          <p className="text-sm text-slate-500">No payments recorded yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Invoice</Th>
                {viewer.isInternal && <Th>Client</Th>}
                <Th>Method</Th>
                <Th>Reference</Th>
                <Th className="text-right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {paymentRows.map(({ p, number, clientName }) => (
                <Tr key={p.id}>
                  <Td>{fmtDate(p.paidOn)}</Td>
                  <Td>
                    <Link href={`/portal/invoices/${p.invoiceId}`} className="font-medium hover:text-brand">
                      {number}
                    </Link>
                  </Td>
                  {viewer.isInternal && <Td>{clientName}</Td>}
                  <Td>{humanize(p.method)}</Td>
                  <Td className="font-mono text-xs">{p.reference ?? '—'}</Td>
                  <Td className="text-right font-semibold tabular-nums text-emerald-700">{formatINR(p.amountPaise)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
