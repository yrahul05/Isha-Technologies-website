export const dynamic = 'force-static';

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
const SHELL = ['/portal/offline', '/portal-icons/icon-192.png', '/portal-icons/icon-512.png'];

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
    event.respondWith(fetch(req).catch(() => caches.match('/portal/offline')));
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

export function GET() {
  return new Response(SW, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/portal/',
    },
  });
}
