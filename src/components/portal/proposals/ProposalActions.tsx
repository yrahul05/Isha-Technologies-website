'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Rocket, XCircle } from 'lucide-react';
import { convertProposalAction, respondProposalAction } from '@/server/actions/proposals';
import type { ActionState } from '@/server/actions/types';

/** Accept / decline (client owner or staff recording an offline decision). */
export function ProposalResponseButtons({ id, internal }: { id: string; internal: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  const [note, setNote] = useState('');
  const run = (decision: 'accepted' | 'rejected') => start(async () => setState(await respondProposalAction(id, decision, note)));
  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-slate-700">{internal ? 'Decision note (optional)' : 'Comments for the team (optional)'}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} onClick={() => run('accepted')} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          <CheckCircle2 className="h-4 w-4" /> {internal ? 'Record as accepted' : 'Accept proposal'}
        </button>
        <button disabled={pending} onClick={() => run('rejected')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50">
          <XCircle className="h-4 w-4" /> {internal ? 'Record as declined' : 'Decline'}
        </button>
      </div>
      {state.error && <p role="alert" className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && state.message && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}
    </div>
  );
}

export function ConvertProposalButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button disabled={pending} onClick={() => start(async () => setState((await convertProposalAction(id)) ?? {}))} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
        <Rocket className="h-4 w-4" /> {pending ? 'Creating project…' : 'Convert to project'}
      </button>
      {state.error && <span role="alert" className="text-sm text-rose-600">{state.error}</span>}
    </div>
  );
}
