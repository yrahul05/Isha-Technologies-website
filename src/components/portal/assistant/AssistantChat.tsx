'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, SendHorizontal, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

export function AssistantChat({ suggestions, configured }: { suggestions: string[]; configured: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }), [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: next }) });
      const json = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!res.ok || !json.reply) setError(json.error ?? 'Something went wrong.');
      else setMessages([...next, { role: 'assistant', content: json.reply }]);
    } catch {
      setError('Couldn’t reach the assistant. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-[420px] flex-col rounded-2xl border border-gray-200 bg-white">
      <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md pt-6 text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand"><Sparkles className="h-5 w-5" /></span>
            <p className="text-sm font-semibold text-slate-900">Ask about your work</p>
            <p className="mt-1 text-xs text-slate-500">Isha AI reads only what your account is allowed to see. It can’t change anything.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button key={s} disabled={!configured} onClick={() => send(s)} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand hover:text-brand disabled:opacity-50">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed', m.role === 'user' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-800')}>{m.content}</div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking that up…</div>}
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-center gap-2 border-t border-gray-100 p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} disabled={!configured} placeholder={configured ? 'Ask a question…' : 'Assistant not configured'} aria-label="Ask Isha AI" className="h-11 flex-1 rounded-xl border border-gray-200 px-3.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50" />
        <button type="submit" disabled={busy || !input.trim() || !configured} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand/90 disabled:opacity-50"><SendHorizontal className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
