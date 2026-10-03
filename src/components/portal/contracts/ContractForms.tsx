'use client';

import { useState, useTransition } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from '../forms';
import { saveContractAction } from '@/server/actions/contracts';
import { renewItemAction, saveRenewalAction } from '@/server/actions/renewals';
import { CURRENCIES, type CurrencyCode } from '@/lib/portal/invoice-math';
import { CONTRACT_KINDS, CONTRACT_STATUSES, RENEWAL_KINDS } from '@/lib/portal/proposals';
import type { ActionState } from '@/server/actions/types';

export type ContractInitial = {
  id: string;
  title: string;
  kind: string;
  clientId: string;
  projectId: string | null;
  documentId: string | null;
  status: string;
  currency: string;
  value: string;
  startDate: string | null;
  endDate: string | null;
  autoRenew: boolean;
  renewalNoticeDays: number;
  signedBy: string | null;
  notes: string;
};

const currencyOptions = (Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => ({ value: c, label: `${c} — ${CURRENCIES[c].name}` }));

export function ContractForm({
  clients,
  projects,
  documents,
  initial,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  documents: { id: string; name: string; clientId: string }[];
  initial?: ContractInitial;
  defaultClientId?: string;
}) {
  const [clientId, setClientId] = useState(initial?.clientId ?? defaultClientId ?? '');
  return (
    <ActionForm action={saveContractAction}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 md:grid-cols-4">
        <TextField label="Title" name="title" required defaultValue={initial?.title} className="md:col-span-2" />
        <SelectField label="Type" name="kind" defaultValue={initial?.kind ?? 'sow'} options={CONTRACT_KINDS.map((k) => ({ value: k.value, label: k.label }))} />
        <SelectField label="Status" name="status" defaultValue={initial?.status ?? 'draft'} options={CONTRACT_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} hint="Clients only see non-draft contracts." />
        {initial ? <input type="hidden" name="clientId" value={initial.clientId} /> : null}
        <SelectField label="Client" name={initial ? 'clientId_display' : 'clientId'} required value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={Boolean(initial)} placeholder="Select client" options={clients.map((c) => ({ value: c.id, label: c.name }))} className="md:col-span-2" />
        <SelectField label="Project" name="projectId" defaultValue={initial?.projectId ?? ''} placeholder="Not project-specific" options={projects.filter((p) => p.clientId === clientId).map((p) => ({ value: p.id, label: p.name }))} key={`p-${clientId}`} />
        <SelectField label="Signed document" name="documentId" defaultValue={initial?.documentId ?? ''} placeholder="None attached" options={documents.filter((d) => d.clientId === clientId).map((d) => ({ value: d.id, label: d.name }))} key={`d-${clientId}`} hint="Upload the signed PDF under Documents first." />
        <SelectField label="Currency" name="currency" defaultValue={initial?.currency ?? 'INR'} options={currencyOptions} />
        <TextField label="Contract value" name="value" inputMode="decimal" defaultValue={initial?.value} />
        <TextField label="Start date" name="startDate" type="date" defaultValue={initial?.startDate ?? ''} />
        <TextField label="End date" name="endDate" type="date" defaultValue={initial?.endDate ?? ''} />
        <TextField label="Renewal notice (days)" name="renewalNoticeDays" type="number" min={0} max={365} defaultValue={initial?.renewalNoticeDays ?? 30} />
        <TextField label="Signed by" name="signedBy" defaultValue={initial?.signedBy ?? ''} />
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-slate-700">
          <input type="checkbox" name="autoRenew" defaultChecked={initial?.autoRenew} className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30" /> Auto-renews
        </label>
        <TextAreaField label="Internal notes" name="notes" rows={3} defaultValue={initial?.notes} className="md:col-span-4" />
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">{initial ? 'Save contract' : 'Create contract'}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export type RenewalInitial = { id?: string; name: string; kind: string; clientId: string | null; vendor: string | null; expiresOn: string; cost: string; currency: string; autoRenew: boolean; remindDays: number; notes: string };

export function RenewalButton({ clients, initial, label }: { clients: { id: string; name: string }[]; initial?: RenewalInitial; label?: string }) {
  return (
    <Modal trigger={initial ? <>{label ?? 'Edit'}</> : <><Plus className="h-4 w-4" /> Track renewal</>} title={initial ? 'Edit renewal' : 'Track a renewal'} description="Domains, SSL, hosting, licences, AMCs — anything that expires.">
      {(close) => (
        <ActionForm action={saveRenewalAction} onSuccess={close}>
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Name" name="name" required defaultValue={initial?.name} className="sm:col-span-2" />
            <SelectField label="Type" name="kind" defaultValue={initial?.kind ?? 'domain'} options={RENEWAL_KINDS.map((k) => ({ value: k.value, label: k.label }))} />
            <SelectField label="Client" name="clientId" defaultValue={initial?.clientId ?? ''} placeholder="Isha Technologies (internal)" options={clients.map((c) => ({ value: c.id, label: c.name }))} />
            <TextField label="Expires on" name="expiresOn" type="date" required defaultValue={initial?.expiresOn} />
            <TextField label="Vendor" name="vendor" defaultValue={initial?.vendor ?? ''} />
            <TextField label="Renewal cost" name="cost" inputMode="decimal" defaultValue={initial?.cost} />
            <SelectField label="Currency" name="currency" defaultValue={initial?.currency ?? 'INR'} options={currencyOptions} />
            <TextField label="Remind (days before)" name="remindDays" type="number" min={1} max={365} defaultValue={initial?.remindDays ?? 30} />
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-slate-700">
              <input type="checkbox" name="autoRenew" defaultChecked={initial?.autoRenew} className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30" /> Auto-renews
            </label>
          </div>
          <TextAreaField label="Notes" name="notes" rows={2} defaultValue={initial?.notes} />
          <div className="flex justify-end"><SubmitButton>Save</SubmitButton></div>
        </ActionForm>
      )}
    </Modal>
  );
}

/** Pick a new expiry date and roll the item or contract forward. */
export function RenewNowButton({ source, id, suggested }: { source: 'item' | 'contract'; id: string; suggested: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(suggested);
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/5">
        <CalendarClock className="h-3.5 w-3.5" /> Renew
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <input type="date" aria-label="New expiry date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 rounded-lg border border-gray-200 px-2 text-xs" />
      <button disabled={pending} onClick={() => start(async () => { const r = await renewItemAction(source, id, date); setState(r); if (r.ok) setOpen(false); })} className="h-8 rounded-lg bg-brand px-2.5 text-xs font-semibold text-white disabled:opacity-50">Confirm</button>
      <button onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-500">Cancel</button>
      {state.error && <span className="text-xs text-rose-600">{state.error}</span>}
    </span>
  );
}
