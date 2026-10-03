import { isPortalHostName } from '@/lib/portal/host';

export const dynamic = 'force-dynamic';

/**
 * Service worker for the installable portal (scope /portal/).
 *
 * Privacy rule: this worker NEVER stores portal pages, API responses,
 * documents or invoices. It only precaches the public offline page and icons,
 * and serves the offline page when a navigation fails because the network is
 * down. Everything private always comes from the network, so a shared device
 * can't surface another user's data from a cache after sign-out.
 */
const SW = `
const VERSION = 'isha-portal-v1';
// Served at /portal/sw.js (legacy) or, on the portal subdomain, at /sw.js.
const BASE = self.location.pathname.startsWith('/portal/') ? '/portal' : '';
const SHELL = [BASE + '/offline', '/portal-icons/icon-192.png', '/portal-icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(BASE + '/offline')));
    return;
  }
  // Static, non-private assets only.
  if (url.pathname.startsWith('/portal-icons/') || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
`;

export function GET(request: Request) {
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(':')[0].toLowerCase();
  const clean = isPortalHostName(host);
  return new Response(SW, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      // At /sw.js the default scope is already '/'; the header only widens /portal/sw.js.
      ...(clean ? {} : { 'Service-Worker-Allowed': '/portal/' }),
    },
  });
}
