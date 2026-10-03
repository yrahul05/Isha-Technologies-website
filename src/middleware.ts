import { NextRequest, NextResponse } from 'next/server';
import { ANALYTICS_SESSION_COOKIE, verifyAnalyticsSessionValue } from '@/lib/analytics-auth';
import { SESSION_COOKIE } from '@/lib/portal/session-cookie';
import { CLEAN_REDIRECTS, cleanPath, internalPath, isPortalHostName, legacyPortalGone, PUBLIC_PORTAL_PATHS } from '@/lib/portal/host';

/**
 * 1. Gates the internal /analytics data API behind its password cookie
 *    (unchanged behaviour — see src/lib/analytics-auth.ts).
 *
 * 2. Portal (/portal, /api/portal): an optimistic, Edge-cheap gate — no
 *    session cookie means straight to the login page (or 401 for APIs).
 *    This is only a fast path; the real check (session row in the DB,
 *    active user, permissions, tenant scoping) runs server-side on every
 *    portal page, server action and route handler. Every portal response
 *    also carries `X-Robots-Tag: noindex` and `Cache-Control: private`
 *    so no private page is ever indexed or cached by a shared cache.
 *
 * 3. Portal subdomain (any portal.* host, see lib/portal/host.ts): on that
 *    host ONLY, clean URLs (/login, /dashboard, /ai…) are rewritten to the
 *    internal /portal/* routes, legacy /portal/* URLs 308 to the clean form,
 *    and nothing of the public website is served. On the public site (www /
 *    apex / production) /portal/* and the CRM API answer 404. Locally and on
 *    Preview deployments the portal still lives at /portal/*.
 */
const PUBLIC_PORTAL_API = ['/api/portal/health', '/api/portal/cron/', '/api/portal/google/callback', '/api/portal/webhooks/'];

function privateHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return response;
}

/** Host the browser asked for (Vercel sets x-forwarded-host/-proto; locally the Host header). */
function requestHost(request: NextRequest): string {
  return (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim().toLowerCase();
}
function requestOrigin(request: NextRequest): string {
  const proto = (request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')).split(',')[0].trim();
  return `${proto}://${requestHost(request)}`;
}

const isPublicPortalPath = (p: string) => PUBLIC_PORTAL_PATHS.some((x) => p === x || p.startsWith(`${x}/`));

/** Session gate + noindex headers for an internal /portal/* path (served as-is or via rewrite). */
function servePortalPage(request: NextRequest, internal: string, rewrite: boolean, cleanHost: boolean): NextResponse {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession && !isPublicPortalPath(internal)) {
    const login = new URL(cleanHost ? '/login' : '/portal/login', requestOrigin(request));
    if (internal !== '/portal' && internal !== '/portal/dashboard') login.searchParams.set('next', internal);
    return privateHeaders(NextResponse.redirect(login));
  }
  // Expose the internal path to server layouts (used to enforce the 2FA policy).
  const forwarded = new Headers(request.headers);
  forwarded.set('x-portal-path', internal);
  const init = { request: { headers: forwarded } };
  if (rewrite) {
    const target = request.nextUrl.clone();
    target.pathname = internal;
    return privateHeaders(NextResponse.rewrite(target, init));
  }
  return privateHeaders(NextResponse.next(init));
}

function servePortalApi(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession && !PUBLIC_PORTAL_API.some((p) => pathname.startsWith(p))) {
    return privateHeaders(NextResponse.json({ error: 'unauthorized' }, { status: 401 }));
  }
  return privateHeaders(NextResponse.next());
}

/** Everything on the portal subdomain. The public website is never served here. */
function handlePortalHost(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next/')) return NextResponse.next();
  if (pathname === '/robots.txt') {
    return privateHeaders(new NextResponse('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
  }
  if (pathname === '/sitemap.xml' || pathname === '/llms.txt') return privateHeaders(new NextResponse('Not found', { status: 404 }));

  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/portal')) return servePortalApi(request);
    return privateHeaders(NextResponse.json({ error: 'not_found' }, { status: 404 }));
  }

  // Legacy /portal/* → clean URL (query string such as ?token= is preserved).
  if (pathname === '/portal' || pathname.startsWith('/portal/')) {
    const url = new URL(cleanPath(pathname) + request.nextUrl.search, requestOrigin(request));
    return privateHeaders(NextResponse.redirect(url, 308));
  }

  if (pathname === '/') return privateHeaders(NextResponse.redirect(new URL('/dashboard', requestOrigin(request))));
  const forward = CLEAN_REDIRECTS[pathname];
  if (forward) return privateHeaders(NextResponse.redirect(new URL(forward, requestOrigin(request))));

  // Public static assets (icons, images, fonts) are passed straight through.
  if (/\.[a-z0-9]+$/i.test(pathname) && pathname !== '/sw.js') return NextResponse.next();

  if (pathname === '/sw.js') return servePortalPage(request, '/portal/sw.js', true, true);
  return servePortalPage(request, internalPath(pathname), true, true);
}

/** A genuine 404 (the public site's not-found page for pages, JSON for the API). */
function notFoundResponse(request: NextRequest, api: boolean): NextResponse {
  if (api) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const target = request.nextUrl.clone();
  target.pathname = '/__not-found';
  target.search = '';
  return NextResponse.rewrite(target);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/api/analytics/dashboard') {
    const cookie = request.cookies.get(ANALYTICS_SESSION_COOKIE)?.value;
    if (!(await verifyAnalyticsSessionValue(cookie))) {
      return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  const host = requestHost(request);
  // The CRM subdomain: detected by hostname (portal.*), no env var required.
  if (isPortalHostName(host)) return handlePortalHost(request);

  // Public website hosts (and any production deployment): the old /portal/* CRM paths and the CRM API are
  // GONE — a real 404, never a redirect. (The cron endpoint stays: it is bearer-secret protected and Vercel
  // calls it on the deployment's own host.)
  if (legacyPortalGone(host)) {
    const legacyPage = pathname === '/portal' || pathname.startsWith('/portal/');
    const legacyApi = pathname.startsWith('/api/portal') && !pathname.startsWith('/api/portal/cron/');
    if (legacyPage || legacyApi) return notFoundResponse(request, legacyApi);
  }

  if (pathname.startsWith('/api/portal')) return servePortalApi(request);

  if (pathname === '/portal' || pathname.startsWith('/portal/')) {
    return servePortalPage(request, pathname, false, false);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/analytics/dashboard',
    '/api/portal/:path*',
    '/portal',
    '/portal/:path*',
    // Everything else is only inspected for the portal-host check; the public
    // website is passed through untouched. Static assets never reach the Edge.
    '/((?!_next/static|_next/image|.*\.(?:png|jpe?g|svg|gif|webp|avif|ico|css|woff2?|mp4|pdf|json|webmanifest|map)$).*)',
  ],
};
