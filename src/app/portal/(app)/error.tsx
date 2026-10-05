'use client';

import { useEffect } from 'react';

/** Recoverable error boundary for CRM pages: the shell stays usable and the user can retry in place. */
export default function PortalPageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The message itself is never shown (it may contain internals); the digest lets support find the server log.
    console.error('[portal] page error', error.digest ?? '');
  }, [error]);
  return (
    <div role="alert" className="mx-auto mt-16 max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
      <p className="mt-2 text-sm text-slate-600">This page couldn&apos;t be loaded. Your data is safe — please try again.</p>
      {error.digest && <p className="mt-2 font-mono text-[11px] text-slate-400">Ref: {error.digest}</p>}
      <button onClick={reset} className="mt-5 h-10 rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-[#2f6ccd]">
        Try again
      </button>
    </div>
  );
}
