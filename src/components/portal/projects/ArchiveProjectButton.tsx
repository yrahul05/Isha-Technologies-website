'use client';

import { useState, useTransition } from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import { archiveProjectAction } from '@/server/actions/projects';

export function ArchiveProjectButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const Icon = archived ? ArchiveRestore : Archive;
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await archiveProjectAction(id, !archived);
            setError(r.error ?? null);
          })
        }
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand disabled:opacity-50"
      >
        <Icon className="h-4 w-4" /> {archived ? 'Restore project' : 'Archive'}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
