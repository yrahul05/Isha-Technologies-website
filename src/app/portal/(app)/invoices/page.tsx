import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { AlarmClock, CircleDollarSign, Download, ReceiptIndianRupee, Wallet } from 'lucide-react';
import { db } from '@/server/db';
import { clients, invoices, payments } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { invoiceScope, paymentScope } from '@/server/scope';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, Pagination, Panel, StatCard, StatusBadge, Table, Td, Th, Tr } from '@/components/portal/ui';
import { CURRENCY_CODES, deriveInvoiceStatus, formatMoney, formatMulti, isCurrency, sumByCurrency, type CurrencyCode } from '@/lib/portal/invoice-math';
import { fmtDate, humanize } from '@/lib/portal/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Invoices' };

const FILTERS = ['all', 'outstanding', 'overdue', 'paid', 'draft', 'cancelled'] as const;

const PAGE = 50;
const PAY_PAGE = 25;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; ppage?: string }> }) {
  const viewer = await requireViewer();
  // Employees without finance access have no invoice area at all.
  if (viewer.isInternal && !can(viewer, 'invoices.view')) notFound();
  const { status: rawStatus, page: rawPage, ppage: rawPPage } = await searchParams;
  const filter = FILTERS.find((f) => f === rawStatus) ?? 'all';
  const page = Math.max(1, Math.floor(Number(rawPage)) || 1);
  const ppage = Math.max(1, Math.floor(Number(rawPPage)) || 1);

  // The derived status (same rules as deriveInvoiceStatus) evaluated in SQL, so filtering, paging and the
  // summary cards are all computed by the database instead of loading every invoice and payment.
  const today = new Date().toISOString().slice(0, 10);
  const derived = sql<string>`(case when ${invoices.status} in ('draft','cancelled') then ${invoices.status}::text when ${invoices.totalPaise} > 0 and ${invoices.paidPaise} >= ${invoices.totalPaise} then 'paid' when ${invoices.dueDate} < ${today} then 'overdue' when ${invoices.paidPaise} > 0 then 'partially_paid' else 'sent' end)`;
  const issuedOnly = sql`${derived} not in ('draft','cancelled')`;
  const listWhere = and(
    invoiceScope(viewer),
    filter === 'all' ? undefined : filter === 'outstanding' ? sql`${derived} in ('sent','partially_paid','overdue')` : sql`${derived} = ${filter}`
  );
  const year = sql<string>`left(${invoices.issueDate}::text, 4)`;

  const [rows, [{ total: listTotal }], statRows, collectedRows, yearRows, paymentRows, [{ total: paymentTotal }]] = await Promise.all([
    db
      .select({
        inv: { id: invoices.id, number: invoices.number, status: invoices.status, currency: invoices.currency, issueDate: invoices.issueDate, dueDate: invoices.dueDate, totalPaise: invoices.totalPaise, paidPaise: invoices.paidPaise },
        clientName: clients.companyName,
        status: derived,
      })
      .from(invoices)
      .innerJoin(clients, eq(clients.id, invoices.clientId))
      .where(listWhere)
      .orderBy(desc(invoices.issueDate), desc(invoices.number))
      .limit(PAGE)
      .offset((page - 1) * PAGE),
    db.select({ total: count() }).from(invoices).where(listWhere),
    // Summary cards: per-currency aggregates over the viewer's issued invoices (₹ and $ are never added together).
    db
      .select({
        currency: invoices.currency,
        billed: sql<number>`coalesce(sum(${invoices.totalPaise}), 0)::bigint`,
        outstanding: sql<number>`coalesce(sum(greatest(0, ${invoices.totalPaise} - ${invoices.paidPaise})), 0)::bigint`,
        overdue: sql<number>`coalesce(sum(${invoices.totalPaise} - ${invoices.paidPaise}) filter (where ${derived} = 'overdue'), 0)::bigint`,
        overdueCount: sql<number>`(count(*) filter (where ${derived} = 'overdue'))::int`,
      })
      .from(invoices)
      .where(and(invoiceScope(viewer), issuedOnly))
      .groupBy(invoices.currency),
    db
      .select({ currency: invoices.currency, amount: sql<number>`coalesce(sum(${payments.amountPaise}), 0)::bigint` })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .where(paymentScope(viewer))
      .groupBy(invoices.currency),
    // Per-year headers describe the whole filtered set, not just the page being shown.
    db
      .select({
        year,
        currency: invoices.currency,
        n: count(),
        billed: sql<number>`coalesce(sum(${invoices.totalPaise}) filter (where ${issuedOnly}), 0)::bigint`,
        paid: sql<number>`coalesce(sum(${invoices.paidPaise}) filter (where ${issuedOnly}), 0)::bigint`,
      })
      .from(invoices)
      .where(listWhere)
      .groupBy(year, invoices.currency),
    db
      .select({
        p: { id: payments.id, invoiceId: payments.invoiceId, paidOn: payments.paidOn, method: payments.method, reference: payments.reference, amountPaise: payments.amountPaise },
        number: invoices.number,
        currency: invoices.currency,
        clientName: clients.companyName,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .innerJoin(clients, eq(clients.id, payments.clientId))
      .where(paymentScope(viewer))
      .orderBy(desc(payments.paidOn), desc(payments.id))
      .limit(PAY_PAGE)
      .offset((ppage - 1) * PAY_PAGE),
    db.select({ total: count() }).from(payments).where(paymentScope(viewer)),
  ]);

  const billed = sumByCurrency(statRows, (r) => r.currency, (r) => Number(r.billed));
  const outstandingMap = sumByCurrency(statRows, (r) => r.currency, (r) => Number(r.outstanding));
  const overdueMap = sumByCurrency(statRows, (r) => r.currency, (r) => Number(r.overdue));
  const overdueCount = statRows.reduce((s, r) => s + Number(r.overdueCount), 0);
  const collected = sumByCurrency(collectedRows, (r) => r.currency, (r) => Number(r.amount));
  const outstanding = [...outstandingMap.values()].some((v) => v > 0);

  const visible = rows.map((r) => ({ ...r, status: r.status as ReturnType<typeof deriveInvoiceStatus> }));

  // Lifetime history grouped by year (clients especially want this view): this page's rows are grouped,
  // while each year's header totals come from the aggregate over the whole filtered set.
  const byYear = new Map<string, typeof visible>();
  for (const r of visible) byYear.set(r.inv.issueDate.slice(0, 4), [...(byYear.get(r.inv.issueDate.slice(0, 4)) ?? []), r]);
  const yearStats = new Map<string, { n: number; billed: Map<CurrencyCode, number>; paid: Map<CurrencyCode, number> }>();
  for (const y of yearRows) {
    const e = yearStats.get(y.year) ?? { n: 0, billed: new Map<CurrencyCode, number>(), paid: new Map<CurrencyCode, number>() };
    e.n += Number(y.n);
    const c: CurrencyCode = isCurrency(y.currency) ? y.currency : 'INR';
    e.billed.set(c, (e.billed.get(c) ?? 0) + Number(y.billed));
    e.paid.set(c, (e.paid.get(c) ?? 0) + Number(y.paid));
    yearStats.set(y.year, e);
  }
  const statusParam: Record<string, string> = filter === 'all' ? {} : { status: filter };
  const pageHref = (p: number) => `/portal/invoices?${new URLSearchParams({ ...statusParam, page: String(p) })}`;
  const payHref = (p: number) => `/portal/invoices?${new URLSearchParams({ ...statusParam, ...(page > 1 ? { page: String(page) } : {}), ppage: String(p) })}`;

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
        <StatCard label={viewer.isInternal ? 'Total billed' : 'Lifetime billed'} value={formatMulti(billed)} icon={ReceiptIndianRupee} />
        <StatCard label={viewer.isInternal ? 'Collected' : 'Paid to date'} value={formatMulti(collected)} icon={CircleDollarSign} tone="green" />
        <StatCard label="Outstanding" value={formatMulti(outstandingMap)} icon={Wallet} tone={outstanding ? 'amber' : 'slate'} href="/portal/invoices?status=outstanding" />
        <StatCard label="Overdue" value={formatMulti(overdueMap)} icon={AlarmClock} tone={overdueCount ? 'red' : 'slate'} href="/portal/invoices?status=overdue" />
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
            const ys = yearStats.get(year);
            const yTotal = ys?.billed ?? new Map<CurrencyCode, number>();
            const yPaid = ys?.paid ?? new Map<CurrencyCode, number>();
            const yDue = new Map<CurrencyCode, number>(CURRENCY_CODES.map((c) => [c, (yTotal.get(c) ?? 0) - (yPaid.get(c) ?? 0)]));
            return (
              <Panel
                key={year}
                title={year}
                description={`${ys?.n ?? list.length} ${(ys?.n ?? list.length) === 1 ? 'invoice' : 'invoices'} · billed ${formatMulti(yTotal, { compact: false })} · paid ${formatMulti(yPaid, { compact: false })} · due ${formatMulti(yDue, { compact: false })}`}
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
                            {inv.status === 'draft' ? 'Draft' : inv.number}
                          </Link>
                          {inv.currency !== 'INR' && <span className="ml-1.5 text-[10px] font-semibold text-slate-400">{inv.currency}</span>}
                        </Td>
                        {viewer.isInternal && <Td>{clientName}</Td>}
                        <Td>{fmtDate(inv.issueDate)}</Td>
                        <Td>{fmtDate(inv.dueDate)}</Td>
                        <Td className="text-right tabular-nums">{formatMoney(inv.totalPaise, inv.currency)}</Td>
                        <Td className="text-right tabular-nums text-emerald-700">{formatMoney(inv.paidPaise, inv.currency)}</Td>
                        <Td className="text-right font-semibold tabular-nums">{formatMoney(Math.max(0, inv.totalPaise - inv.paidPaise), inv.currency)}</Td>
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
          <Pagination page={page} pageSize={PAGE} total={listTotal} hrefFor={pageHref} />
        </div>
      )}

      <Panel className="mt-6" title="Payment history" description={`${paymentTotal} payments · ${formatMulti(collected, { compact: false })} received`}>
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
              {paymentRows.map(({ p, number, currency, clientName }) => (
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
                  <Td className="text-right font-semibold tabular-nums text-emerald-700">{formatMoney(p.amountPaise, currency)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={ppage} pageSize={PAY_PAGE} total={paymentTotal} hrefFor={payHref} />
      </Panel>
    </>
  );
}
