import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './portal.css';

// Private application: never indexed, never followed, never cached in
// search results. Middleware also sends `X-Robots-Tag: noindex` on every
// /portal response, and no portal URL is in the sitemap.
export const metadata: Metadata = {
  title: { default: 'Portal | Isha Technologies', template: '%s · Isha Technologies Portal' },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const dynamic = 'force-dynamic';

export default function PortalRootLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-white text-slate-900">{children}</div>;
}
