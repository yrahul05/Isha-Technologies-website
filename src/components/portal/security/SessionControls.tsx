'use client';

import { useState, useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { revokeAllUserSessionsAction, revokeUserSessionAction } from '@/server/actions/security';

/** Sign one device out, or (with `userId`) every device of a user — two-step confirm. */
export function RevokeSessionButton({ sessionId, userId, userName }: { sessionId?: string; userId?: string; userName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; text?: string }>({});
  if (result.ok) return <span className="text-xs font-medium text-emerald-700">{result.text}</span>;
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600">
        <LogOut className="h-3.5 w-3.5" /> {userId ? 'Sign out everywhere' : 'Sign out'}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-slate-600">{userId ? `Sign ${userName} out of every device?` : 'Sign this device out?'}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = userId ? await revokeAllUserSessionsAction(userId) : await revokeUserSessionAction(sessionId!);
            setResult({ ok: r.ok, text: r.error ?? r.message ?? 'Done' });
            if (!r.ok) setConfirming(false);
          })
        }
        className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        Confirm
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900">
        Cancel
      </button>
      {result.text && !result.ok && <span className="text-xs text-rose-600">{result.text}</span>}
    </span>
  );
}
