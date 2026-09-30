'use client';

import Link from 'next/link';
import { useOptimistic, useState, useTransition } from 'react';
import { ArrowRightLeft, CalendarClock, Pencil, Plus } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from '../forms';
import { convertLeadAction, createLeadAction, logLeadActivityAction, setLeadStatusAction, updateLeadAction } from '@/server/actions/leads';
import { formatINR } from '@/lib/portal/invoice-math';
import { cn } from '@/lib/utils';

export const LEAD_STAGES = [
  { key: 'new', label: 'New', dot: 'bg-sky-500' },
  { key: 'contacted', label: 'Contacted', dot: 'bg-brand' },
  { key: 'qualified', label: 'Qualified', dot: 'bg-violet-500' },
  { key: 'proposal_sent', label: 'Proposal sent', dot: 'bg-amber-500' },
  { key: 'negotiation', label: 'Negotiation', dot: 'bg-amber-600' },
  { key: 'won', label: 'Won', dot: 'bg-emerald-500' },
  { key: 'lost', label: 'Lost', dot: 'bg-slate-400' },
] as const;
type Stage = (typeof LEAD_STAGES)[number]['key'];

const SOURCES = [
  { value: 'manual', label: 'Manual entry' },
  { value: 'website_assessment', label: 'Website — Free Cloud Assessment' },
  { value: 'contact_form', label: 'Website — contact form' },
  { value: 'referral', label: 'Referral' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'other', label: 'Other' },
];

export type LeadValues = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  source: string;
  serviceInterested: string | null;
  status: string;
  estimatedValuePaise: number;
  followUpAt: string | null; // YYYY-MM-DDTHH:mm IST
  assignedTo: string | null;
  notes: string;
};

function LeadForm({ initial, people, canAssign, onDone }: { initial?: LeadValues; people: { id: string; name: string }[]; canAssign: boolean; onDone?: () => void }) {
  return (
    <ActionForm action={initial ? updateLeadAction : createLeadAction} onSuccess={() => onDone?.()}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Lead name" name="name" required defaultValue={initial?.name} />
        <TextField label="Company" name="company" defaultValue={initial?.company ?? ''} />
        <TextField label="Email" name="email" type="email" required defaultValue={initial?.email} />
        <TextField label="Phone" name="phone" defaultValue={initial?.phone ?? ''} />
        <SelectField label="Source" name="source" defaultValue={initial?.source ?? 'manual'} options={SOURCES} />
        <TextField label="Service interested" name="serviceInterested" defaultValue={initial?.serviceInterested ?? ''} placeholder="Kubernetes, FinOps…" />
        <SelectField label="Status" name="status" defaultValue={initial?.status ?? 'new'} options={LEAD_STAGES.map((s) => ({ value: s.key, label: s.label }))} />
        <TextField label="Estimated value (₹)" name="estimatedValue" inputMode="decimal" defaultValue={initial ? String(initial.estimatedValuePaise / 100) : ''} />
        <TextField label="Follow-up (IST)" name="followUpAt" type="datetime-local" defaultValue={initial?.followUpAt ?? ''} />
        <SelectField label="Assigned salesperson" name="assignedTo" defaultValue={initial?.assignedTo ?? ''} disabled={!canAssign} placeholder="Me" options={people.map((p) => ({ value: p.id, label: p.name }))} />
      </div>
      {!canAssign && <input type="hidden" name="assignedTo" value={initial?.assignedTo ?? ''} />}
      <TextAreaField label="Notes" name="notes" rows={4} defaultValue={initial?.notes} />
      <div className="flex justify-end">
        <SubmitButton>{initial ? 'Save lead' : 'Create lead'}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function NewLeadButton({ people }: { people: { id: string; name: string }[] }) {
  return (
    <Modal trigger={<><Plus className="h-4 w-4" /> Add lead</>} title="Add lead" wide>
      {(close) => <LeadForm people={people} canAssign onDone={close} />}
    </Modal>
  );
}

export function EditLeadButton(props: { initial: LeadValues; people: { id: string; name: string }[]; canAssign: boolean }) {
  return (
    <Modal trigger={<><Pencil className="h-4 w-4" /> Edit</>} triggerVariant="secondary" title="Edit lead" wide>
      {(close) => <LeadForm {...props} onDone={close} />}
    </Modal>
  );
}

export type PipelineLead = { id: string; name: string; company: string | null; status: Stage; value: number; followUpAt: string | null; overdue: boolean; owner: string | null; editable: boolean };

/** Drag-and-drop sales pipeline with optimistic stage changes. */
export function Pipeline({ leads }: { leads: PipelineLead[] }) {
  const [items, move] = useOptimistic(leads, (s, { id, status }: { id: string; status: Stage }) => s.map((l) => (l.id === id ? { ...l, status } : l)));
  const [, start] = useTransition();
  const [over, setOver] = useState<string | null>(null);
  const drop = (id: string, status: Stage) => {
    const lead = items.find((l) => l.id === id);
    if (!lead || !lead.editable || lead.status === status) return;
    start(async () => {
      move({ id, status });
      await setLeadStatusAction(id, status);
    });
  };
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
      {LEAD_STAGES.map((stage) => {
        const col = items.filter((l) => l.status === stage.key);
        const total = col.reduce((s, l) => s + l.value, 0);
        return (
          <section
            key={stage.key}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(stage.key);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              drop(e.dataTransfer.getData('text/lead-id'), stage.key);
            }}
            className={cn('flex w-[230px] shrink-0 flex-col rounded-2xl border bg-slate-50/70 p-2.5', over === stage.key ? 'border-brand/50 bg-brand/[0.05]' : 'border-gray-200')}
          >
            <header className="px-1.5 pb-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className={cn('h-2 w-2 rounded-full', stage.dot)} />
                {stage.label}
                <span className="ml-auto text-[11px] font-semibold text-slate-400">{col.length}</span>
              </p>
              <p className="text-[11px] tabular-nums text-slate-500">{formatINR(total, { compact: true })}</p>
            </header>
            <ul className="flex min-h-20 flex-col gap-2">
              {col.map((l) => (
                <li
                  key={l.id}
                  draggable={l.editable}
                  onDragStart={(e) => e.dataTransfer.setData('text/lead-id', l.id)}
                  className={cn('rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:border-brand/40 hover:shadow-[0_8px_20px_-12px_rgba(52,120,228,0.45)]', l.editable && 'cursor-grab')}
                >
                  <Link href={`/portal/leads/${l.id}`} className="block text-sm font-semibold text-slate-900 hover:text-brand">
                    {l.name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">{l.company ?? 'Individual'}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="font-semibold tabular-nums text-slate-700">{l.value ? formatINR(l.value, { compact: true }) : '—'}</span>
                    {l.followUpAt && (
                      <span className={cn('inline-flex items-center gap-1', l.overdue ? 'font-semibold text-rose-600' : 'text-slate-500')}>
                        <CalendarClock className="h-3 w-3" /> {l.followUpAt}
                      </span>
                    )}
                  </div>
                  {l.editable && (
                    <select
                      aria-label={`Move ${l.name}`}
                      value={l.status}
                      onChange={(e) => drop(l.id, e.target.value as Stage)}
                      className="mt-2 w-full rounded-lg border border-gray-100 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 focus:border-brand focus:outline-none sm:hidden"
                    >
                      {LEAD_STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function LogActivityForm({ id }: { id: string }) {
  return (
    <ActionForm action={logLeadActivityAction} resetOnSuccess showSuccess={false}>
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-2">
        <select name="kind" aria-label="Activity type" className="rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-brand focus:outline-none">
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="meeting">Meeting</option>
          <option value="note">Note</option>
        </select>
        <input name="body" placeholder="What happened?" aria-label="Activity details" className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
        <SubmitButton>Log</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function ConvertLeadButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        disabled={pending}
        onClick={() => start(async () => setError((await convertLeadAction(id)).error ?? null))}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
      >
        <ArrowRightLeft className="h-4 w-4" /> Convert to client
      </button>
      {error && <span className="text-sm text-rose-600">{error}</span>}
    </>
  );
}
