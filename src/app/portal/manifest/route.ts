import { isPortalHostName } from '@/lib/portal/host';

export const dynamic = 'force-dynamic';

/**
 * Web app manifest for the installable portal. On the portal subdomain the app
 * lives at the root with clean URLs; anywhere else (local, previews) it keeps
 * the /portal/ scope. Public (no session needed) — it contains no private data.
 */
export function GET(request: Request) {
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(':')[0].toLowerCase();
  const clean = isPortalHostName(host);
  const base = clean ? '' : '/portal';
  const manifest = {
    name: 'Isha Technologies Portal',
    short_name: 'Isha Portal',
    description: 'Projects, tasks, invoices and meetings with Isha Technologies.',
    id: clean ? '/' : '/portal/',
    start_url: `${base}/dashboard`,
    scope: clean ? '/' : '/portal/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#3478e4',
    icons: [
      { src: '/portal-icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/portal-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/portal-icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Tasks', url: `${base}/tasks` },
      { name: 'Invoices', url: `${base}/invoices` },
      { name: 'Meetings', url: `${base}/meetings` },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
