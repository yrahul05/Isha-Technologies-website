import { NextRequest, NextResponse } from 'next/server';
import { ANALYTICS_SESSION_COOKIE, verifyAnalyticsSessionValue } from '@/lib/analytics-auth';
import { SESSION_COOKIE } from '@/lib/portal/session-cookie';

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
 */
const PUBLIC_PORTAL_PATHS = ['/portal/login', '/portal/forgot-password', '/portal/reset-password', '/portal/accept-invite', '/portal/offline', '/portal/sw.js'];
const PUBLIC_PORTAL_API = ['/api/portal/cron/', '/api/portal/google/callback', '/api/portal/webhooks/'];

function privateHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return response;
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

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith('/api/portal')) {
    if (!hasSession && !PUBLIC_PORTAL_API.some((p) => pathname.startsWith(p))) {
      return privateHeaders(NextResponse.json({ error: 'unauthorized' }, { status: 401 }));
    }
    return privateHeaders(NextResponse.next());
  }

  if (pathname === '/portal' || pathname.startsWith('/portal/')) {
    const isPublic = PUBLIC_PORTAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (!hasSession && !isPublic) {
      const login = new URL('/portal/login', request.url);
      if (pathname !== '/portal' && pathname !== '/portal/dashboard') login.searchParams.set('next', pathname);
      return privateHeaders(NextResponse.redirect(login));
    }
    // Expose the path to server layouts (used to enforce the 2FA policy).
    const forwarded = new Headers(request.headers);
    forwarded.set('x-portal-path', pathname);
    return privateHeaders(NextResponse.next({ request: { headers: forwarded } }));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/analytics/dashboard', '/portal', '/portal/:path*', '/api/portal/:path*'],
};
