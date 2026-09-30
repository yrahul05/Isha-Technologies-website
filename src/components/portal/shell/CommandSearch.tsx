'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileText,
  FolderKanban,
  LifeBuoy,
  Loader2,
  ReceiptIndianRupee,
  Search,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Result = { type: string; id: string; title: string; subtitle: string; href: string };

const TYPE_META: Record<string, { label: string; icon: LucideIcon }> = {
  client: { label: 'Clients', icon: Building2 },
  project: { label: 'Projects', icon: FolderKanban },
  task: { label: 'Tasks', icon: ClipboardCheck },
  invoice: { label: 'Invoices', icon: ReceiptIndianRupee },
  document: { label: 'Documents', icon: FileText },
  ticket: { label: 'Tickets', icon: LifeBuoy },
  meeting: { label: 'Meetings', icon: CalendarClock },
  lead: { label: 'Leads', icon: Target },
};

/** ⌘K / Ctrl+K search palette. Results come from the permission-scoped search API. */
export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/portal/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = (await res.json()) as { results: Result[] };
        setResults(data.results ?? []);
        setActive(0);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Result[]>();
    results.forEach((r) => map.set(r.type, [...(map.get(r.type) ?? []), r]));
    return [...map.entries()];
  }, [results]);

  const go = (r: Result) => {
    setOpen(false);
    setQ('');
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let index = -1;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-slate-400 transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <Search className="h-4 w-4" />
          <span className="flex-1 truncate text-left">Search projects, tasks, invoices…</span>
          <kbd className="hidden rounded-md border border-gray-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-500 sm:inline">Ctrl K</kbd>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-gray-100 px-4">
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-brand" /> : <Search className="h-4 w-4 text-slate-400" />}
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search everything you have access to…"
              className="h-14 flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <kbd className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">Esc</kbd>
          </div>
          <ul ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
            {q.trim().length < 2 && <li className="px-3 py-8 text-center text-sm text-slate-500">Type at least two characters.</li>}
            {q.trim().length >= 2 && !loading && results.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-slate-500">No results you have access to.</li>
            )}
            {grouped.map(([type, rows]) => {
              const meta = TYPE_META[type];
              return (
                <li key={type} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{meta?.label ?? type}</p>
                  <ul>
                    {rows.map((r) => {
                      index += 1;
                      const i = index;
                      const Icon = meta?.icon ?? FileText;
                      return (
                        <li key={r.id}>
                          <button
                            data-index={i}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => go(r)}
                            className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left', i === active ? 'bg-brand/[0.07]' : 'hover:bg-slate-50')}
                          >
                            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', i === active ? 'bg-brand text-white' : 'bg-brand/10 text-brand')}>
                              <Icon className="h-4 w-4" strokeWidth={1.75} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-slate-900">{r.title}</span>
                              <span className="block truncate text-xs text-slate-500">{r.subtitle}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
