import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { isDatabaseConfigured } from '@/server/db';
import { Logo } from '@/components/ui/logo';
import './portal.css';

// Private application: never indexed, never followed, never cached in
// search results. Middleware also sends `X-Robots-Tag: noindex` on every
// /portal response, and no portal URL is in the sitemap.
export const metadata: Metadata = {
  title: { default: 'Portal | Isha Technologies', template: '%s · Isha Technologies Portal' },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  manifest: '/portal/manifest',
  appleWebApp: { capable: true, title: 'Isha Portal', statusBarStyle: 'default' },
  icons: { apple: '/portal-icons/icon-192.png' },
};

export const viewport: Viewport = { themeColor: '#3478e4', viewportFit: 'cover' };

export const dynamic = 'force-dynamic';

export default function PortalRootLayout({ children }: { children: ReactNode }) {
  // Deployed before the production database is connected: show a clear,
  // branded notice instead of a server error. Nothing below renders (so no
  // database access is attempted) until DATABASE_URL is set.
  if (!isDatabaseConfigured()) return <PortalNotConfigured />;
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* On the portal subdomain usePathname() sees clean URLs, so hide the public site's chrome in the server HTML itself (no flash). */}
      <style href="portal-hide-public-chrome" precedence="default">{'[data-public-chrome]{display:none!important}'}</style>
      {children}
    </div>
  );
}

function PortalNotConfigured() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-brand/5 px-5">
      <div className="w-full max-w-md text-center">
        <Logo src="/ISHA-TECHNO-LG.png" imgClassName="mx-auto h-10 w-auto" className="mb-8" />
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Settings2 className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Client portal coming online</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The Isha Technologies client portal is being set up. If you need something in the meantime, our team is one message away.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="inline-flex h-10 items-center rounded-lg bg-brand px-5 text-sm font-medium text-white hover:bg-[#2f6ccd]">
            Contact us
          </Link>
          <Link href="/" className="inline-flex h-10 items-center rounded-lg border border-brand px-5 text-sm font-medium text-brand hover:bg-brand/5">
            Back to website
          </Link>
        </div>
      </div>
    </main>
  );
}
