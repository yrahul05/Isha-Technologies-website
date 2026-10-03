import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';

export const metadata: Metadata = { title: 'Offline' };

/** Public, static page served by the service worker when the network is unavailable. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-brand/5 px-5">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <WifiOff className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">You’re offline</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">The portal needs a connection to show your projects and invoices. For your security, no account data is stored on this device. Reconnect and try again.</p>
        <a href="/portal/dashboard" className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand px-5 text-sm font-medium text-white">Try again</a>
      </div>
    </main>
  );
}
