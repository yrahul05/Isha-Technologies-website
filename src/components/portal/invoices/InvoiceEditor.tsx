'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField, inputClass } from '../forms';
import { saveInvoiceAction } from '@/server/actions/invoices';
import { computeLine, computeTotals, formatINR, gstSplit, GST_STATES, rupeesToPaise } from '@/lib/portal/invoice-math';
import { cn } from '@/lib/utils';

type ClientOpt = { id: string; name: string; billingName: string; billingAddress: string; gstin: string | null; stateCode: string | null };
type Line = { description: string; hsnSac: string; quantity: string; unitPrice: string; discountPct: string; taxRatePct: string };

export type InvoiceInitial = {
  id: string;
  status: string;
  clientId: string;
  projectId: string | null;
  issueDate: string;
  dueDate: string;
  billingName: string;
  billingAddress: string;
  billingGstin: string | null;
  placeOfSupply: string | null;
  notes: string;
  terms: string;
  items: Line[];
};

export function InvoiceEditor({
  clients,
  projects,
  defaults,
  initial,
  defaultClientId,
}: {
  clients: ClientOpt[];
  projects: { id: string; name: string; clientId: string }[];
  defaults: { dueDays: number; terms: string; notes: string; taxRatePct: number; sacCode: string; supplierStateCode: string };
  initial?: InvoiceInitial;
  defaultClientId?: string;
}) {
  const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const plusDays = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
  const blank = (): Line => ({ description: '', hsnSac: defaults.sacCode, quantity: '1', unitPrice: '', discountPct: '0', taxRatePct: String(defaults.taxRatePct) });

  const firstClient = clients.find((c) => c.id === (initial?.clientId ?? defaultClientId));
  const [clientId, setClientId] = useState(firstClient?.id ?? '');
  const [billing, setBilling] = useState({
    billingName: initial?.billingName ?? firstClient?.billingName ?? '',
    billingAddress: initial?.billingAddress ?? firstClient?.billingAddress ?? '',
    billingGstin: initial?.billingGstin ?? firstClient?.gstin ?? '',
    placeOfSupply: initial?.placeOfSupply ?? firstClient?.stateCode ?? '',
  });
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? today);
  const [lines, setLines] = useState<Line[]>(initial?.items.length ? initial.items : [blank()]);

  const onClient = (id: string) => {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) setBilling({ billingName: c.billingName, billingAddress: c.billingAddress, billingGstin: c.gstin ?? '', placeOfSupply: c.stateCode ?? '' });
  };

  const numeric = lines.map((l) => ({ quantity: Number(l.quantity) || 0, unitPricePaise: rupeesToPaise(l.unitPrice || 0), discountPct: Number(l.discountPct) || 0, taxRatePct: Number(l.taxRatePct) || 0 }));
  const totals = useMemo(() => computeTotals(numeric), [numeric]);
  const split = gstSplit(totals.taxPaise, defaults.supplierStateCode, billing.placeOfSupply);
  const setLine = (i: number, patch: Partial<Line>) => setLines((all) => all.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const cell = cn(inputClass, 'px-2.5 py-2');
  const sent = initial && initial.status !== 'draft';

  return (
    <ActionForm action={saveInvoiceAction}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="items" value={JSON.stringify(lines)} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <SelectField label="Client" name="clientId" required value={clientId} onChange={(e) => onClient(e.target.value)} disabled={Boolean(initial)} placeholder="Select client" options={clients.map((c) => ({ value: c.id, label: c.name }))} className="md:col-span-2" />
          {initial && <input type="hidden" name="clientId" value={initial.clientId} />}
          <SelectField label="Project" name="projectId" defaultValue={initial?.projectId ?? ''} placeholder="Not project-specific" options={projects.filter((p) => p.clientId === clientId).map((p) => ({ value: p.id, label: p.name }))} className="md:col-span-2" key={clientId} />
          <TextField label="Invoice date" name="issueDate" type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          <TextField label="Due date" name="dueDate" type="date" required defaultValue={initial?.dueDate ?? plusDays(today, defaults.dueDays)} key={`due-${issueDate}`} />
          <SelectField
            label="Place of supply"
            name="placeOfSupply"
            value={billing.placeOfSupply}
            onChange={(e) => setBilling((b) => ({ ...b, placeOfSupply: e.target.value }))}
            placeholder="Select state"
            options={GST_STATES.map((s) => ({ value: s.code, label: `${s.code} · ${s.name}` }))}
            className="md:col-span-2"
            hint={split.kind === 'intra' ? 'Same state as supplier → CGST + SGST' : 'Different state → IGST'}
          />
          <TextField label="Billing name" name="billingName" required value={billing.billingName} onChange={(e) => setBilling((b) => ({ ...b, billingName: e.target.value }))} className="md:col-span-2" />
          <TextField label="Client GSTIN" name="billingGstin" value={billing.billingGstin} onChange={(e) => setBilling((b) => ({ ...b, billingGstin: e.target.value }))} className="md:col-span-2" />
          <TextAreaField label="Billing address" name="billingAddress" rows={2} value={billing.billingAddress} onChange={(e) => setBilling((b) => ({ ...b, billingAddress: e.target.value }))} className="md:col-span-4" />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-[15px] font-semibold text-slate-900">Line items</h2>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-2">Description</th>
                <th className="w-24 pb-2 pr-2">HSN/SAC</th>
                <th className="w-20 pb-2 pr-2">Qty</th>
                <th className="w-32 pb-2 pr-2">Rate (₹)</th>
                <th className="w-20 pb-2 pr-2">Disc %</th>
                <th className="w-20 pb-2 pr-2">GST %</th>
                <th className="w-32 pb-2 text-right">Amount</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="align-top">
                  <td className="py-1 pr-2">
                    <input aria-label={`Line ${i + 1} description`} className={cell} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Service or deliverable" />
                  </td>
                  <td className="py-1 pr-2">
                    <input aria-label="HSN/SAC" className={cell} value={l.hsnSac} onChange={(e) => setLine(i, { hsnSac: e.target.value })} />
                  </td>
                  <td className="py-1 pr-2">
                    <input aria-label="Quantity" inputMode="decimal" className={cell} value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                  </td>
                  <td className="py-1 pr-2">
                    <input aria-label="Rate" inputMode="decimal" className={cell} value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} placeholder="0.00" />
                  </td>
                  <td className="py-1 pr-2">
                    <input aria-label="Discount percent" inputMode="decimal" className={cell} value={l.discountPct} onChange={(e) => setLine(i, { discountPct: e.target.value })} />
                  </td>
                  <td className="py-1 pr-2">
                    <select aria-label="GST rate" className={cell} value={l.taxRatePct} onChange={(e) => setLine(i, { taxRatePct: e.target.value })}>
                      {['0', '5', '12', '18', '28'].map((r) => (
                        <option key={r} value={r}>
                          {r}%
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 text-right font-semibold tabular-nums text-slate-900">{formatINR(computeLine(numeric[i]).taxablePaise)}</td>
                  <td className="py-1 pl-1">
                    <button type="button" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((all) => all.filter((_, j) => j !== i))} className="mt-1.5 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setLines((all) => [...all, blank()])} className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand hover:bg-brand/5">
          <Plus className="h-4 w-4" /> Add line
        </button>

        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatINR(totals.subtotalPaise)} />
            {totals.discountPaise > 0 && <Row label="Discount" value={`- ${formatINR(totals.discountPaise)}`} />}
            {split.kind === 'intra' ? (
              <>
                <Row label="CGST" value={formatINR(split.cgstPaise)} />
                <Row label="SGST" value={formatINR(split.sgstPaise)} />
              </>
            ) : (
              <Row label="IGST" value={formatINR(split.igstPaise)} />
            )}
            <div className="flex items-center justify-between rounded-xl bg-brand px-3 py-2 text-white">
              <dt className="font-semibold">Total</dt>
              <dd className="text-base font-bold tabular-nums">{formatINR(totals.totalPaise)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:grid-cols-2">
        <TextAreaField label="Notes (shown on invoice)" name="notes" rows={3} defaultValue={initial?.notes ?? defaults.notes} />
        <TextAreaField label="Payment terms" name="terms" rows={3} defaultValue={initial?.terms ?? defaults.terms} />
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        {!sent && (
          <SubmitButton variant="secondary" name="intent" value="draft" pendingLabel="Saving…">
            Save draft
          </SubmitButton>
        )}
        <SubmitButton name="intent" value="send" pendingLabel="Saving…">
          {sent ? 'Save changes' : 'Save & send to client'}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-3 text-slate-600">
      <dt>{label}</dt>
      <dd className="tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}
