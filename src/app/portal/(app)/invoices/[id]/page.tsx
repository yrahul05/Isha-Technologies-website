import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, FileEdit, Pencil } from 'lucide-react';
import { can, requireViewer } from '@/server/auth/viewer';
import { getVisibleInvoice } from '@/server/queries/invoices';
import { getSetting } from '@/server/settings';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel, StatusBadge, Table, Td, Th, Tr } from '@/components/portal/ui';
import { InvoiceStatusButtons, RecordPaymentButton } from '@/components/portal/invoices/InvoiceActions';
import { computeLine, formatINR, gstSplit, GST_STATES } from '@/lib/portal/invoice-math';
import { fmtDate, humanize } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Invoice' };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const data = await getVisibleInvoice(viewer, id);
  if (!data) notFound();
  const { inv, status, items, payments } = data;
  const [company, tax] = await Promise.all([getSetting('company'), getSetting('tax')]);
  const split = gstSplit(inv.taxPaise, tax.stateCode, inv.placeOfSupply);
  const due = Math.max(0, inv.totalPaise - inv.paidPaise);
  const manage = can(viewer, 'invoices.manage');
  const pos = GST_STATES.find((s) => s.code === inv.placeOfSupply);

  return (
    <>
      <Link href="/portal/invoices" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand">
        <ArrowLeft className="h-3.5 w-3.5" /> All invoices
      </Link>
      <PageHeader
        eyebrow={viewer.isInternal ? data.clientName : 'Invoice'}
        title={inv.number}
        description={<StatusBadge status={status} />}
        actions={
          <>
            {status !== 'draft' && (
              <Button asChild variant="secondary" className="h-10 rounded-lg px-4 text-sm">
                <a href={`/api/portal/invoices/${inv.id}/pdf`}>
                  <Download className="h-4 w-4" /> Download PDF
                </a>
              </Button>
            )}
            {manage && status !== 'cancelled' && (
              <Button asChild variant="secondary" className="h-10 rounded-lg px-4 text-sm">
                <Link href={`/portal/invoices/${inv.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            {can(viewer, 'payments.record') && due > 0 && status !== 'draft' && status !== 'cancelled' && (
              <RecordPaymentButton invoiceId={inv.id} dueLabel={formatINR(due)} dueRupees={String(due / 100)} />
            )}
            {!viewer.isInternal && (
              <Button asChild variant="secondary" className="h-10 rounded-lg px-4 text-sm">
                <Link href={`/portal/change-requests?entity=invoice&id=${inv.id}`}>
                  <FileEdit className="h-4 w-4" /> Request a correction
                </Link>
              </Button>
            )}
          </>
        }
      />
      {manage && status !== 'cancelled' && (status === 'draft' || inv.paidPaise === 0) && (
        <div className="mb-4">
          <InvoiceStatusButtons id={inv.id} canSend={status === 'draft'} canCancel={inv.paidPaise === 0} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white xl:col-span-2">
          <div className="h-1.5 bg-brand" />
          <div className="p-6 md:p-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row">
              <Image src="/ISHA-TECHNO-LG.png" alt="Isha Technologies" width={180} height={60} className="h-12 w-auto" />
              <div className="sm:text-right">
                <p className="text-xl font-bold tracking-tight text-slate-900">TAX INVOICE</p>
                <p className="font-semibold text-brand">{inv.number}</p>
              </div>
            </div>
            <div className="mt-8 grid gap-6 text-sm sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">From</p>
                <p className="mt-1 font-semibold text-slate-900">{company.legalName || company.name}</p>
                <p className="text-slate-500">{[company.city, company.state].filter(Boolean).join(', ')}</p>
                {tax.gstin && <p className="font-mono text-xs text-slate-500">GSTIN {tax.gstin}</p>}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">Bill to</p>
                <p className="mt-1 font-semibold text-slate-900">{inv.billingName}</p>
                <p className="whitespace-pre-line text-slate-500">{inv.billingAddress}</p>
                {inv.billingGstin && <p className="font-mono text-xs text-slate-500">GSTIN {inv.billingGstin}</p>}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">Details</p>
                <p className="mt-1 text-slate-600">Issued {fmtDate(inv.issueDate)}</p>
                <p className="text-slate-600">Due {fmtDate(inv.dueDate)}</p>
                {pos && <p className="text-slate-600">Place of supply: {pos.name}</p>}
                {data.projectName && <p className="text-slate-600">Project: {data.projectName}</p>}
              </div>
            </div>

            <div className="mt-8">
              <Table>
                <thead>
                  <tr>
                    <Th>Description</Th>
                    <Th>HSN/SAC</Th>
                    <Th className="text-right">Qty</Th>
                    <Th className="text-right">Rate</Th>
                    <Th className="text-right">Disc.</Th>
                    <Th className="text-right">GST</Th>
                    <Th className="text-right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <Tr key={it.id}>
                      <Td className="font-medium text-slate-900">{it.description}</Td>
                      <Td className="text-xs">{it.hsnSac ?? '—'}</Td>
                      <Td className="text-right tabular-nums">{it.quantity}</Td>
                      <Td className="text-right tabular-nums">{formatINR(it.unitPricePaise)}</Td>
                      <Td className="text-right tabular-nums">{it.discountPct ? `${it.discountPct}%` : '—'}</Td>
                      <Td className="text-right tabular-nums">{it.taxRatePct}%</Td>
                      <Td className="text-right font-semibold tabular-nums">{formatINR(computeLine(it).taxablePaise)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <dl className="ml-auto mt-6 max-w-xs space-y-1.5 text-sm">
              <Line label="Subtotal" value={formatINR(inv.subtotalPaise)} />
              {inv.discountPaise > 0 && <Line label="Discount" value={`- ${formatINR(inv.discountPaise)}`} />}
              {split.kind === 'intra' ? (
                <>
                  <Line label="CGST" value={formatINR(split.cgstPaise)} />
                  <Line label="SGST" value={formatINR(split.sgstPaise)} />
                </>
              ) : (
                <Line label="IGST" value={formatINR(split.igstPaise)} />
              )}
              <Line label="Total" value={formatINR(inv.totalPaise)} strong />
              <Line label="Paid" value={formatINR(inv.paidPaise)} />
              <div className="flex items-center justify-between rounded-xl bg-brand px-3 py-2 text-white">
                <dt className="font-semibold">Balance due</dt>
                <dd className="font-bold tabular-nums">{formatINR(due)}</dd>
              </div>
            </dl>
            {(inv.notes || inv.terms) && (
              <div className="mt-8 grid gap-4 border-t border-gray-100 pt-5 text-sm sm:grid-cols-2">
                {inv.notes && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">Notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-600">{inv.notes}</p>
                  </div>
                )}
                {inv.terms && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">Terms</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-600">{inv.terms}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </article>

        <div className="space-y-6">
          <Panel title="Payments" description={`${formatINR(inv.paidPaise)} of ${formatINR(inv.totalPaise)} received`}>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {payments.map(({ p, by }) => (
                  <li key={p.id} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold tabular-nums text-emerald-700">{formatINR(p.amountPaise)}</span>
                      <span className="text-xs text-slate-500">{fmtDate(p.paidOn)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {humanize(p.method)}
                      {p.reference ? ` · ${p.reference}` : ''}
                      {viewer.isInternal && by ? ` · recorded by ${by}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between px-3">
      <dt className={strong ? 'font-semibold text-slate-900' : 'text-slate-600'}>{label}</dt>
      <dd className={strong ? 'font-bold tabular-nums text-slate-900' : 'tabular-nums text-slate-900'}>{value}</dd>
    </div>
  );
}
