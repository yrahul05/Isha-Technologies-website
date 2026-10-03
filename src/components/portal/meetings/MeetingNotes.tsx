'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Circle, ListPlus, Trash2 } from 'lucide-react';
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from '../forms';
import { addActionItemAction, deleteActionItemAction, promoteActionItemAction, saveMinutesAction, toggleActionItemAction } from '@/server/actions/meeting-notes';
import type { ActionState } from '@/server/actions/types';

export type ActionItemView = { id: string; title: string; done: boolean; assignee: string | null; assigneeId: string | null; dueDate: string | null; taskId: string | null };

export function MinutesForm({ meetingId, minutes, visibility, hasClient }: { meetingId: string; minutes: string; visibility: 'internal' | 'client'; hasClient: boolean }) {
  return (
    <ActionForm action={saveMinutesAction}>
      <input type="hidden" name="meetingId" value={meetingId} />
      <TextAreaField label="Minutes & decisions" name="minutes" rows={7} defaultValue={minutes} placeholder="What was discussed and decided…" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SelectField
          label="Who can read the notes"
          name="visibility"
          defaultValue={visibility}
          options={[{ value: 'internal', label: 'Isha team only' }, ...(hasClient ? [{ value: 'client', label: 'Team and client attendees' }] : [])]}
          className="w-64"
        />
        <SubmitButton pendingLabel="Saving…">Save notes</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function ActionItems({ meetingId, items, people, canWrite, canPromote, viewerId }: { meetingId: string; items: ActionItemView[]; people: { id: string; name: string }[]; canWrite: boolean; canPromote: boolean; viewerId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionState>) =>
    start(async () => {
      const r = await fn();
      setError(r.error ?? null);
    });
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No action items yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((i) => (
            <li key={i.id} className="flex items-start gap-3 py-2.5">
              <button aria-label={i.done ? 'Mark as open' : 'Mark as done'} disabled={pending || !(canWrite || i.assigneeId === viewerId)} onClick={() => run(() => toggleActionItemAction(i.id))} className="mt-0.5 text-slate-400 hover:text-emerald-600 disabled:cursor-default disabled:hover:text-slate-400">
                {i.done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={i.done ? 'text-sm text-slate-400 line-through' : 'text-sm font-medium text-slate-900'}>{i.title}</p>
                <p className="text-xs text-slate-500">{[i.assignee, i.dueDate && `due ${i.dueDate}`, i.taskId && 'task created'].filter(Boolean).join(' · ') || 'Unassigned'}</p>
              </div>
              {canWrite && (
                <span className="flex shrink-0 items-center gap-1">
                  {canPromote && !i.taskId && (
                    <button disabled={pending} onClick={() => run(() => promoteActionItemAction(i.id))} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/5 disabled:opacity-40">
                      Create task
                    </button>
                  )}
                  <button aria-label="Delete action item" disabled={pending} onClick={() => run(() => deleteActionItemAction(i.id))} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {canWrite && (
        <ActionForm action={addActionItemAction} resetOnSuccess showSuccess={false} className="rounded-xl border border-dashed border-gray-200 p-3">
          <input type="hidden" name="meetingId" value={meetingId} />
          <div className="grid gap-3 sm:grid-cols-6">
            <TextField label="New action item" name="title" required className="sm:col-span-3" />
            <SelectField label="Owner" name="assigneeId" placeholder="Unassigned" options={people.map((p) => ({ value: p.id, label: p.name }))} className="sm:col-span-2" />
            <TextField label="Due" name="dueDate" type="date" />
          </div>
          <div className="flex justify-end">
            <SubmitButton variant="secondary" pendingLabel="Adding…">
              <ListPlus className="h-4 w-4" /> Add
            </SubmitButton>
          </div>
        </ActionForm>
      )}
    </div>
  );
}
