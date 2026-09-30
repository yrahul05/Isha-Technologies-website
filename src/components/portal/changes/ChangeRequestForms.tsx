'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton, TextAreaField, inputClass } from '../forms';
import { reviewChangeRequestAction, submitChangeRequestAction } from '@/server/actions/change-requests';
import { cn } from '@/lib/utils';

export type ChangeTarget = {
  key: string;
  entityType: 'client' | 'invoice' | 'project' | 'document';
  entityId: string;
  label: string;
  fields: { field: string; label: string; current: string }[];
};

const LONG = new Set(['billingAddress', 'description', 'addressLine1', 'addressLine2']);

export function ChangeRequestForm({ targets, defaultKey }: { targets: ChangeTarget[]; defaultKey?: string }) {
  const [key, setKey] = useState(defaultKey && targets.some((t) => t.key === defaultKey) ? defaultKey : (targets[0]?.key ?? ''));
  const target = targets.find((t) => t.key === key);
  const [field, setField] = useState(target?.fields[0]?.field ?? '');
  const selected = target?.fields.find((f) => f.field === field) ?? target?.fields[0];

  return (
    <ActionForm action={submitChangeRequestAction} resetOnSuccess>
      <input type="hidden" name="entityType" value={target?.entityType ?? ''} />
      <input type="hidden" name="entityId" value={target?.entityId ?? ''} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-700">What needs changing?</span>
          <select
            className={inputClass}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setField(targets.find((t) => t.key === e.target.value)?.fields[0]?.field ?? '');
            }}
          >
            {targets.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-700">Field</span>
          <select name="field" className={inputClass} value={selected?.field ?? ''} onChange={(e) => setField(e.target.value)}>
            {target?.fields.map((f) => (
              <option key={f.field} value={f.field}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {selected && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Current value</span>
            <p className="min-h-[42px] whitespace-pre-wrap rounded-xl border border-dashed border-gray-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">{selected.current || '—'}</p>
          </div>
          <label className="space-y-1.5" key={`${key}-${selected.field}`}>
            <span className="text-xs font-semibold text-slate-700">Requested value</span>
            {selected.field === 'delete' ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                Request removal of this document.
                <input type="hidden" name="newValue" value="true" />
              </p>
            ) : selected.field === 'dueDate' ? (
              <input name="newValue" type="date" className={inputClass} defaultValue={selected.current} />
            ) : LONG.has(selected.field) ? (
              <textarea name="newValue" rows={3} className={cn(inputClass, 'resize-y')} defaultValue={selected.current} />
            ) : (
              <input name="newValue" className={inputClass} defaultValue={selected.current} />
            )}
          </label>
        </div>
      )}
      <TextAreaField label="Reason for the change" name="reason" required rows={2} placeholder="e.g. Our registered office moved in March." />
      <div className="flex justify-end">
        <SubmitButton>Submit for approval</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function ReviewChangeForm({ id }: { id: string }) {
  return (
    <ActionForm action={reviewChangeRequestAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input name="note" placeholder="Note to client (optional)" aria-label="Review note" className={cn(inputClass, 'py-2 text-xs')} />
      <div className="flex gap-2">
        <SubmitButton name="decision" value="approved" className="h-8 px-3 text-xs">
          Approve & apply
        </SubmitButton>
        <SubmitButton name="decision" value="rejected" variant="secondary" className="h-8 px-3 text-xs">
          Reject
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
