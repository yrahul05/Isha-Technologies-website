'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

/**
 * Registers the portal service worker and offers "Install app" once the
 * browser says the portal is installable. The banner is dismissible and the
 * dismissal is remembered (best effort) for 30 days.
 */
export function PwaClient() {
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      // Legacy /portal/* URLs vs the portal subdomain (clean URLs, root scope).
      const legacy = location.pathname === '/portal' || location.pathname.startsWith('/portal/');
      navigator.serviceWorker.register(legacy ? '/portal/sw.js' : '/sw.js', { scope: legacy ? '/portal/' : '/' }).catch(() => undefined);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      try {
        const until = Number(localStorage.getItem('portal-install-dismissed') ?? 0);
        if (until > Date.now()) return;
      } catch {}
      setEvent(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!event) return null;
  const dismiss = () => {
    try {
      localStorage.setItem('portal-install-dismissed', String(Date.now() + 30 * 86_400_000));
    } catch {}
    setEvent(null);
  };
  return (
    <div role="dialog" aria-label="Install the Isha portal app" className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] sm:left-auto sm:right-6 sm:max-w-sm" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"><Download className="h-5 w-5" /></span>
      <p className="min-w-0 flex-1 text-sm text-slate-700"><span className="block font-semibold text-slate-900">Install the portal</span>Add it to your home screen for quick access.</p>
      <button onClick={async () => { await event.prompt(); await event.userChoice.catch(() => undefined); setEvent(null); }} className="h-9 rounded-lg bg-brand px-3 text-sm font-semibold text-white">Install</button>
      <button aria-label="Dismiss" onClick={dismiss} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><X className="h-4 w-4" /></button>
    </div>
  );
}
