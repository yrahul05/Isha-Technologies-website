'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, RotateCcw, Trash2 } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, SubmitButton, TextField } from '../forms';
import { archiveTaskAction, deleteTaskAction, purgeTaskAction, restoreDeletedTaskAction } from '@/server/actions/tasks';

const btn = 'inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand disabled:opacity-50';

function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setError(r.error ?? null);
      if (!r.error) after?.();
    });
  return { pending, error, run };
}

/** Completed → Archived (and back). Archived tasks leave the board but stay in history. */
export function ArchiveTaskButton({ id, archived }: { id: string; archived: boolean }) {
  const { pending, error, run } = useRun();
  const Icon = archived ? ArchiveRestore : Archive;
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={pending} onClick={() => run(() => archiveTaskAction(id, !archived))} className={btn}>
        <Icon className="h-4 w-4" /> {archived ? 'Unarchive' : 'Archive'}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}

/** Soft delete with an explicit confirmation step. Recoverable by a Super Admin. */
export function DeleteTaskButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const { pending, error, run } = useRun();
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={`${btn} hover:border-rose-300 hover:text-rose-600`}>
        <Trash2 className="h-4 w-4" /> Delete
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5">
      <span className="text-sm text-rose-800">Move this task to Recently deleted?</span>
      <button type="button" disabled={pending} onClick={() => run(() => deleteTaskAction(id), () => router.push('/portal/tasks'))} className="h-8 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
        Delete
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="h-8 px-2 text-sm font-semibold text-slate-600">
        Cancel
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}

export function RestoreDeletedTaskButton({ id }: { id: string }) {
  const { pending, error, run } = useRun();
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={pending} onClick={() => run(() => restoreDeletedTaskAction(id))} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand">
        <RotateCcw className="h-3.5 w-3.5" /> Restore
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}

/** Super Admin only: permanent deletion, confirmed by typing the exact title. */
export function PurgeTaskButton({ id, title }: { id: string; title: string }) {
  return (
    <Modal
      title="Permanently delete task"
      description="This removes the task, its comments and checklist for good. It cannot be undone; the audit log keeps a record."
      triggerVariant="ghost"
      triggerClassName="h-7 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
      trigger={
        <>
          <Trash2 className="h-3.5 w-3.5" /> Delete forever
        </>
      }
    >
      {(close) => (
        <ActionForm action={purgeTaskAction} onSuccess={close}>
          <input type="hidden" name="id" value={id} />
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Type <span className="font-semibold text-slate-900">{title}</span> to confirm.
          </p>
          <TextField label="Task title" name="confirm" required autoComplete="off" />
          <div className="flex justify-end">
            <SubmitButton variant="destructive" pendingLabel="Deleting…">
              Permanently delete
            </SubmitButton>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}
