'use client';

import { useOptimistic, useTransition } from 'react';
import { Check, Lock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionForm, SubmitButton, inputClass } from '../forms';
import { addChecklistItemAction, addTaskCommentAction, deleteChecklistItemAction, toggleChecklistItemAction } from '@/server/actions/tasks';
import { ProgressBar } from '../ui';

type Item = { id: string; label: string; isDone: boolean };

export function Checklist({ taskId, items, editable }: { taskId: string; items: Item[]; editable: boolean }) {
  const [list, update] = useOptimistic(items, (state, action: { type: 'toggle' | 'delete'; id: string; done?: boolean }) =>
    action.type === 'delete' ? state.filter((i) => i.id !== action.id) : state.map((i) => (i.id === action.id ? { ...i, isDone: Boolean(action.done) } : i))
  );
  const [, start] = useTransition();
  const done = list.filter((i) => i.isDone).length;

  return (
    <div>
      {list.length > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <ProgressBar value={(done / list.length) * 100} tone={done === list.length ? 'green' : 'brand'} />
          <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">
            {done}/{list.length}
          </span>
        </div>
      )}
      <ul className="space-y-1">
        {list.map((item) => (
          <li key={item.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
            <button
              type="button"
              disabled={!editable}
              aria-pressed={item.isDone}
              aria-label={`${item.isDone ? 'Uncheck' : 'Check'} ${item.label}`}
              onClick={() =>
                start(async () => {
                  update({ type: 'toggle', id: item.id, done: !item.isDone });
                  await toggleChecklistItemAction(taskId, item.id, !item.isDone);
                })
              }
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                item.isDone ? 'border-brand bg-brand text-white' : 'border-gray-300 bg-white hover:border-brand',
                !editable && 'cursor-default'
              )}
            >
              {item.isDone && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </button>
            <span className={cn('flex-1 text-sm', item.isDone ? 'text-slate-400 line-through' : 'text-slate-800')}>{item.label}</span>
            {editable && (
              <button
                type="button"
                aria-label={`Delete ${item.label}`}
                onClick={() =>
                  start(async () => {
                    update({ type: 'delete', id: item.id });
                    await deleteChecklistItemAction(taskId, item.id);
                  })
                }
                className="rounded p-1 text-slate-300 opacity-0 hover:text-rose-500 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
        {list.length === 0 && <li className="px-2 text-sm text-slate-500">No sub-tasks.</li>}
      </ul>
      {editable && (
        <ActionForm action={addChecklistItemAction} resetOnSuccess showSuccess={false} className="mt-3 flex gap-2 space-y-0">
          <input type="hidden" name="taskId" value={taskId} />
          <input name="label" placeholder="Add a sub-task" aria-label="New sub-task" className={cn(inputClass, 'py-2')} />
          <SubmitButton className="shrink-0">Add</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

export function CommentComposer({ taskId, isInternalUser, taskIsInternal }: { taskId: string; isInternalUser: boolean; taskIsInternal: boolean }) {
  return (
    <ActionForm action={addTaskCommentAction} resetOnSuccess showSuccess={false}>
      <input type="hidden" name="taskId" value={taskId} />
      <textarea name="body" rows={3} placeholder="Write a comment…" aria-label="Comment" className={cn(inputClass, 'resize-y')} />
      <div className="flex items-center justify-between gap-3">
        {isInternalUser && !taskIsInternal ? (
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" name="internal" className="h-4 w-4 rounded accent-[#3478e4]" />
            <Lock className="h-3.5 w-3.5" /> Internal note (hidden from client)
          </label>
        ) : (
          <span className="text-xs text-slate-500">{isInternalUser ? 'Internal task — comments stay within the team.' : 'Visible to your Isha Technologies team.'}</span>
        )}
        <SubmitButton>Comment</SubmitButton>
      </div>
    </ActionForm>
  );
}
