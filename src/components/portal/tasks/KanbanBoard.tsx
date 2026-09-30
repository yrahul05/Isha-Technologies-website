'use client';

import Link from 'next/link';
import { useOptimistic, useState, useTransition } from 'react';
import { CalendarDays, CheckSquare, Eye, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { daysUntil, fmtDate } from '@/lib/portal/format';
import { setTaskStatusAction } from '@/server/actions/tasks';
import { Avatar, Badge, StatusBadge } from '../ui';

export type BoardTask = {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority: string;
  dueDate: string | null;
  project: string;
  assignee: string | null;
  visibility: 'internal' | 'client';
  checklistDone: number;
  checklistTotal: number;
  comments: number;
  editable: boolean;
};

const COLUMNS: { key: BoardTask['status']; label: string; accent: string }[] = [
  { key: 'todo', label: 'To do', accent: 'bg-slate-400' },
  { key: 'in_progress', label: 'In progress', accent: 'bg-brand' },
  { key: 'review', label: 'Review', accent: 'bg-violet-500' },
  { key: 'blocked', label: 'Blocked', accent: 'bg-rose-500' },
  { key: 'completed', label: 'Completed', accent: 'bg-emerald-500' },
];

/**
 * Kanban with native drag-and-drop and optimistic moves. Every card also
 * has a status menu, so the board is fully usable by keyboard and on touch
 * screens where HTML5 drag isn't available. The server re-checks that the
 * user may edit each task; a rejected move rolls back.
 */
export function KanbanBoard({ tasks, showProject = true }: { tasks: BoardTask[]; showProject?: boolean }) {
  const [optimistic, move] = useOptimistic(tasks, (state, { id, status }: { id: string; status: BoardTask['status'] }) =>
    state.map((t) => (t.id === id ? { ...t, status } : t))
  );
  const [, start] = useTransition();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const moveTask = (id: string, status: BoardTask['status']) => {
    const task = optimistic.find((t) => t.id === id);
    if (!task || task.status === status || !task.editable) return;
    setError(null);
    start(async () => {
      move({ id, status });
      const res = await setTaskStatusAction(id, status);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div>
      {error && <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {COLUMNS.map((col) => {
          const items = optimistic.filter((t) => t.status === col.key);
          return (
            <section
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.key);
              }}
              onDragLeave={() => setDragOver((c) => (c === col.key ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                moveTask(e.dataTransfer.getData('text/task-id'), col.key);
              }}
              className={cn(
                'flex w-[280px] shrink-0 snap-start flex-col rounded-2xl border bg-slate-50/70 p-2.5 transition-colors',
                dragOver === col.key ? 'border-brand/50 bg-brand/[0.05]' : 'border-gray-200'
              )}
              aria-label={col.label}
            >
              <header className="flex items-center justify-between px-1.5 pb-2.5 pt-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className={cn('h-2 w-2 rounded-full', col.accent)} />
                  {col.label}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-gray-200">{items.length}</span>
              </header>
              <ul className="flex min-h-24 flex-1 flex-col gap-2">
                {items.map((t) => {
                  const d = daysUntil(t.dueDate);
                  const late = d !== null && d < 0 && t.status !== 'completed';
                  return (
                    <li
                      key={t.id}
                      draggable={t.editable}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/task-id', t.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      className={cn(
                        'group rounded-xl border border-gray-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[box-shadow,border-color,transform] duration-200 hover:border-brand/40 hover:shadow-[0_8px_20px_-12px_rgba(52,120,228,0.45)]',
                        t.editable && 'cursor-grab active:cursor-grabbing'
                      )}
                    >
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <StatusBadge status={t.priority} />
                        {t.visibility === 'client' && (
                          <Badge tone="brand">
                            <Eye className="h-3 w-3" /> Client
                          </Badge>
                        )}
                      </div>
                      <Link href={`/portal/tasks/${t.id}`} className="block text-sm font-medium leading-snug text-slate-900 hover:text-brand">
                        {t.title}
                      </Link>
                      {showProject && <p className="mt-0.5 truncate text-xs text-slate-500">{t.project}</p>}
                      <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                        {t.dueDate && (
                          <span className={cn('inline-flex items-center gap-1', late && 'font-semibold text-rose-600')}>
                            <CalendarDays className="h-3 w-3" />
                            {fmtDate(t.dueDate, 'short')}
                          </span>
                        )}
                        {t.checklistTotal > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <CheckSquare className="h-3 w-3" />
                            {t.checklistDone}/{t.checklistTotal}
                          </span>
                        )}
                        {t.comments > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {t.comments}
                          </span>
                        )}
                        <span className="ml-auto">{t.assignee && <Avatar name={t.assignee} size="xs" />}</span>
                      </div>
                      {t.editable && (
                        <label className="mt-2 block">
                          <span className="sr-only">Move {t.title}</span>
                          <select
                            value={t.status}
                            onChange={(e) => moveTask(t.id, e.target.value as BoardTask['status'])}
                            className="w-full rounded-lg border border-gray-100 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 opacity-100 focus:border-brand focus:outline-none sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                          >
                            {COLUMNS.map((c) => (
                              <option key={c.key} value={c.key}>
                                Move to: {c.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </li>
                  );
                })}
                {items.length === 0 && <li className="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-slate-400">Drop tasks here</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
