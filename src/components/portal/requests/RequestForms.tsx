'use client';

import { useState, useTransition } from 'react';
import { Check, MessageSquarePlus, Plus, Undo2, X } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField, Toggle } from '../forms';
import { commentOnTaskRequestAction, createTaskRequestAction, reviewTaskRequestAction, updateTaskRequestAction, withdrawTaskRequestAction } from '@/server/actions/task-requests';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

type Option = { id: string; name: string };
export type RequestInitial = { id: string; title: string; description: string; projectId: string | null; priority: string; desiredDueDate: string | null };

function RequestFields({ projects, initial }: { projects: Option[]; initial?: RequestInitial }) {
  return (
    <>
      <TextField label="What do you need?" name="title" required maxLength={200} defaultValue={initial?.title} placeholder="e.g. Add a staging environment for the mobile API" />
      <TextAreaField label="Details" name="description" required rows={5} defaultValue={initial?.description} hint="Background, expected outcome, links — anything that helps us scope it." />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Project" name="projectId" defaultValue={initial?.projectId ?? ''} placeholder="Not sure / general" options={projects.map((p) => ({ value: p.id, label: p.name }))} />
        <SelectField label="Priority" name="priority" defaultValue={initial?.priority ?? 'medium'} options={PRIORITIES} />
        <TextField label="Needed by" name="desiredDueDate" type="date" defaultValue={initial?.desiredDueDate ?? ''} />
      </div>
    </>
  );
}

/** Client: ask Isha Technologies for new work. Nothing is assigned until it's approved. */
export function NewRequestButton({ projects }: { projects: Option[] }) {
  return (
    <Modal
      wide
      title="Request new work"
      description="Your request goes to Isha Technologies for approval. Once approved it becomes a task and is assigned to the right engineer."
      trigger={
        <>
          <Plus className="h-4 w-4" /> New request
        </>
      }
    >
      {() => (
        <ActionForm action={createTaskRequestAction}>
          <RequestFields projects={projects} />
          <div className="flex justify-end">
            <SubmitButton pendingLabel="Submitting…">Submit request</SubmitButton>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}

/** Client: refine a request while it is still pending approval (audited). */
export function EditRequestButton({ projects, initial }: { projects: Option[]; initial: RequestInitial }) {
  return (
    <Modal wide title="Edit request" description="You can change a request until it’s reviewed. Every change is recorded." triggerVariant="secondary" trigger="Edit request">
      {(close) => (
        <ActionForm action={updateTaskRequestAction} onSuccess={close}>
          <input type="hidden" name="id" value={initial.id} />
          <RequestFields projects={projects} initial={initial} />
          <div className="flex justify-end">
            <SubmitButton>Save changes</SubmitButton>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}

export function WithdrawRequestButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600">
        <Undo2 className="h-4 w-4" /> Withdraw
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-600">Withdraw this request?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await withdrawTaskRequestAction(id);
            if (r.error) setError(r.error);
          })
        }
        className="h-9 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        Withdraw
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="h-9 rounded-lg px-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
        Cancel
      </button>
      {error && <span className="text-sm text-rose-600">{error}</span>}
    </span>
  );
}

export function RequestCommentForm({ id, staff }: { id: string; staff: boolean }) {
  return (
    <ActionForm action={commentOnTaskRequestAction} resetOnSuccess showSuccess={false}>
      <input type="hidden" name="id" value={id} />
      <TextAreaField label={staff ? 'Reply or add a note' : 'Add information'} name="body" rows={3} required />
      {staff && <Toggle name="internal" label="Internal note" description="Only visible to the Isha Technologies team." />}
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Posting…">
          <MessageSquarePlus className="h-4 w-4" /> Post
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

/** Reviewer (Super Admin by default): approve into a task on the client's project, or decline with a note. */
export function ReviewRequestForm({ id, projects, defaultProjectId, priority, dueDate }: { id: string; projects: Option[]; defaultProjectId: string | null; priority: string; dueDate: string | null }) {
  return (
    <ActionForm action={reviewTaskRequestAction}>
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Project" name="projectId" required defaultValue={defaultProjectId ?? ''} placeholder="Choose a project" options={projects.map((p) => ({ value: p.id, label: p.name }))} hint="Only this client’s projects." />
        <SelectField label="Priority" name="priority" defaultValue={priority} options={PRIORITIES} />
        <TextField label="Due date" name="dueDate" type="date" defaultValue={dueDate ?? ''} />
      </div>
      <TextAreaField label="Note to the client" name="note" rows={2} hint="Required when declining. Shown to the client." />
      <div className="flex flex-wrap justify-end gap-2">
        <SubmitButton name="decision" value="rejected" variant="secondary">
          <X className="h-4 w-4" /> Decline
        </SubmitButton>
        <SubmitButton name="decision" value="approved">
          <Check className="h-4 w-4" /> Approve & create task
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
