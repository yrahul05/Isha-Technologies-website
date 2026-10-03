'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { ActionForm, SelectField, SubmitButton, TextField } from '../forms';
import { deleteTimeEntryAction, logTimeAction, setRateAction } from '@/server/actions/time';

export function TimeEntryForm({ projects, tasks, today }: { projects: { id: string; name: string }[]; tasks: { id: string; title: string; projectId: string }[]; today: string }) {
  const [projectId, setProjectId] = useState('');
  return (
    <ActionForm action={logTimeAction} resetOnSuccess onSuccess={() => setProjectId('')}>
      <div className="grid gap-4 md:grid-cols-6">
        <SelectField label="Project" name="projectId" required value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Select project" options={projects.map((p) => ({ value: p.id, label: p.name }))} className="md:col-span-2" />
        <SelectField label="Task (optional)" name="taskId" placeholder="No specific task" options={tasks.filter((t) => t.projectId === projectId).map((t) => ({ value: t.id, label: t.title }))} key={projectId} className="md:col-span-2" />
        <TextField label="Date" name="workDate" type="date" required defaultValue={today} max={today} />
        <TextField label="Time spent" name="duration" required placeholder="1.5 or 1:30" hint="Hours, h:mm or 90m" />
        <TextField label="What did you work on?" name="note" className="md:col-span-4" maxLength={500} />
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-slate-700">
          <input type="checkbox" name="billable" defaultChecked className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/30" /> Billable
        </label>
        <div className="flex items-end justify-end">
          <SubmitButton pendingLabel="Logging…">Log time</SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}

export function DeleteEntryButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button aria-label="Delete entry" disabled={pending} onClick={() => start(async () => void (await deleteTimeEntryAction(id)))} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

/** Inline hourly-rate editor (rupees per hour) for a person's cost or a project's billing rate. */
export function RateForm({ kind, targetId, current, label }: { kind: 'cost' | 'bill'; targetId: string; current: number; label: string }) {
  return (
    <ActionForm action={setRateAction} showSuccess={false} className="flex items-start gap-1.5 space-y-0">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="targetId" value={targetId} />
      <input name="rate" aria-label={label} inputMode="decimal" defaultValue={current ? String(current / 100) : ''} placeholder="₹/hr" className="h-8 w-24 rounded-lg border border-gray-200 px-2 text-sm tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
      <SubmitButton variant="secondary" pendingLabel="…">Save</SubmitButton>
    </ActionForm>
  );
}
