'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField, inputClass } from '../forms';
import { saveProposalAction } from '@/server/actions/proposals';
import { computeLine, computeTotals, CURRENCIES, formatMoney, rupeesToPaise, type CurrencyCode } from '@/lib/portal/invoice-math';
import { cn } from '@/lib/utils';

type Line = { description: string; quantity: string; unitPrice: string; discountPct: string; taxRatePct: string };

export type ProposalInitial = {
  id: string;
  title: string;
  clientId: string | null;
  leadId: string | null;
  currency: string;
  validUntil: string | null;
  summary: string;
  scope: string;
  terms: string;
  items: Line[];
};

export function ProposalEditor({
  clients,
  leads,
  initial,
  defaultClientId,
  defaultLeadId,
  defaultTerms,
}: {
  clients: { id: string; name: string; international: boolean }[];
  leads: { id: string; name: string }[];
  initial?: ProposalInitial;
  defaultClientId?: string;
  defaultLeadId?: string;
  defaultTerms: string;
}) {
  const plusDays = (n: number) => new Date(Date.now() + 5.5 * 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);
  const [audience, setAudience] = useState<'client' | 'lead'>(initial?.leadId || (!initial && defaultLeadId) ? 'lead' : 'client');
  const [currency, setCurrency] = useState<CurrencyCode>((initial?.currency as CurrencyCode) ?? 'INR');
  const taxDefault = (cur: CurrencyCode) => (cur === 'INR' ? '18' : '0');
  const blank = (cur: CurrencyCode = currency): Line => ({ description: '', quantity: '1', unitPrice: '', discountPct: '0', taxRatePct: taxDefault(cur) });
  const [lines, setLines] = useState<Line[]>(initial?.items.length ? initial.items : [blank()]);

  const numeric = lines.map((l) => ({ quantity: Number(l.quantity) || 0, unitPricePaise: rupeesToPaise(l.unitPrice || 0), discountPct: Number(l.discountPct) || 0, taxRatePct: Number(l.taxRatePct) || 0 }));
  const totals = useMemo(() => computeTotals(numeric), [numeric]);
  const money = (v: number) => formatMoney(v, currency);
  const setLine = (i: number, patch: Partial<Line>) => setLines((all) => all.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const cell = cn(inputClass, 'px-2.5 py-2');
  const applyCurrency = (cur: CurrencyCode) => {
    setCurrency(cur);
    setLines((all) => all.map((l) => ({ ...l, taxRatePct: taxDefault(cur) })));
  };

  return (
    <ActionForm action={saveProposalAction}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <input type="hidden" name="currency" value={currency} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Prepared for</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <TextField label="Proposal title" name="title" required defaultValue={initial?.title} className="md:col-span-4" placeholder="e.g. AWS landing-zone & CI/CD setup" />
          <div className="space-y-1.5 md:col-span-2">
            <span className="block text-xs font-semibold text-slate-700">Recipient</span>
            <div className="flex gap-2 text-sm">
              {(['client', 'lead'] as const).map((a) => (
                <button key={a} type="button" onClick={() => setAudience(a)} className={cn('rounded-lg border px-3 py-1.5 font-medium', audience === a ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200 text-slate-600')}>
                  {a === 'client' ? 'Existing client' : 'Lead (not a client yet)'}
                </button>
              ))}
            </div>
          </div>
          {audience === 'client' ? (
            <SelectField label="Client" name="clientId" required defaultValue={initial?.clientId ?? defaultClientId ?? ''} placeholder="Select client" options={clients.map((c) => ({ value: c.id, label: c.name }))} className="md:col-span-2" onChange={(e) => { const c = clients.find((x) => x.id === e.target.value); if (c && !initial) applyCurrency(c.international ? 'USD' : 'INR'); }} />
          ) : (
            <SelectField label="Lead" name="leadId" required defaultValue={initial?.leadId ?? defaultLeadId ?? ''} placeholder="Select lead" options={leads.map((l) => ({ value: l.id, label: l.name }))} className="md:col-span-2" hint="Accepting the proposal creates the client account automatically." />
          )}
          <SelectField label="Currency" name="currency_display" value={currency} onChange={(e) => applyCurrency(e.target.value as CurrencyCode)} options={(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => ({ value: c, label: `${c} — ${CURRENCIES[c].name}` }))} />
          <TextField label="Valid until" name="validUntil" type="date" defaultValue={initial?.validUntil ?? plusDays(30)} hint="Required to send." />
          <TextAreaField label="Summary" name="summary" rows={3} defaultValue={initial?.summary} className="md:col-span-4" hint="A short pitch the client reads first." />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-[15px] font-semibold text-slate-900">Pricing</h2>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-2">Deliverable</th>
                <th className="w-20 pb-2 pr-2">Qty</th>
                <th className="w-32 pb-2 pr-2">Rate</th>
                <th className="w-20 pb-2 pr-2">Disc %</th>
                <th className="w-20 pb-2 pr-2">Tax %</th>
                <th className="w-32 pb-2 text-right">Amount</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="align-top">
                  <td className="py-1 pr-2"><input aria-label={`Line ${i + 1} description`} className={cell} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Phase / deliverable" /></td>
                  <td className="py-1 pr-2"><input aria-label="Quantity" inputMode="decimal" className={cell} value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} /></td>
                  <td className="py-1 pr-2"><input aria-label="Rate" inputMode="decimal" className={cell} value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} placeholder="0.00" /></td>
                  <td className="py-1 pr-2"><input aria-label="Discount percent" inputMode="decimal" className={cell} value={l.discountPct} onChange={(e) => setLine(i, { discountPct: e.target.value })} /></td>
                  <td className="py-1 pr-2"><input aria-label="Tax percent" inputMode="decimal" className={cell} value={l.taxRatePct} onChange={(e) => setLine(i, { taxRatePct: e.target.value })} /></td>
                  <td className="py-3 text-right font-semibold tabular-nums text-slate-900">{money(computeLine(numeric[i]).taxablePaise)}</td>
                  <td className="py-1 pl-1">
                    <button type="button" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((all) => all.filter((_, j) => j !== i))} className="mt-1.5 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setLines((all) => [...all, blank()])} className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand hover:bg-brand/5"><Plus className="h-4 w-4" /> Add line</button>
        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between px-3 text-slate-600"><dt>Subtotal</dt><dd className="tabular-nums text-slate-900">{money(totals.subtotalPaise)}</dd></div>
            {totals.discountPaise > 0 && <div className="flex justify-between px-3 text-slate-600"><dt>Discount</dt><dd className="tabular-nums text-slate-900">- {money(totals.discountPaise)}</dd></div>}
            <div className="flex justify-between px-3 text-slate-600"><dt>Tax</dt><dd className="tabular-nums text-slate-900">{money(totals.taxPaise)}</dd></div>
            <div className="flex items-center justify-between rounded-xl bg-brand px-3 py-2 text-white"><dt className="font-semibold">Total ({currency})</dt><dd className="text-base font-bold tabular-nums">{money(totals.totalPaise)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:grid-cols-2">
        <TextAreaField label="Scope of work" name="scope" rows={8} defaultValue={initial?.scope} hint="Deliverables, assumptions and exclusions." />
        <TextAreaField label="Terms" name="terms" rows={8} defaultValue={initial?.terms ?? defaultTerms} />
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <SubmitButton variant="secondary" name="intent" value="draft" pendingLabel="Saving…">Save draft</SubmitButton>
        <SubmitButton name="intent" value="send" pendingLabel="Sending…">Send proposal</SubmitButton>
      </div>
    </ActionForm>
  );
}
