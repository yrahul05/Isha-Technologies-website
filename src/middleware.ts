import { NextRequest, NextResponse } from 'next/server';
import { ANALYTICS_SESSION_COOKIE, verifyAnalyticsSessionValue } from '@/lib/analytics-auth';

/**
 * Gates the internal /analytics dashboard and its data API behind the
 * password-derived session cookie (src/lib/analytics-auth.ts). Every other
 * route on the site is untouched — this middleware only ever inspects
 * requests matched by `config.matcher` below.
 *
 * The dashboard PAGE itself (src/app/analytics/page.tsx) still renders a
 * login form rather than a blank redirect target when unauthenticated, so
 * this middleware's job for `/analytics` is narrow: block the DATA route
 * (`/api/analytics/dashboard`) outright, and let the page render through
 * (it does its own cookie check server-side to decide login-form vs.
 * dashboard) — this avoids a redirect loop and keeps the login UI on the
 * same URL a bookmark or shared link would use.
 */
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/api/analytics/dashboard') {
    const cookie = request.cookies.get(ANALYTICS_SESSION_COOKIE)?.value;
    if (!(await verifyAnalyticsSessionValue(cookie))) {
      return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/analytics/dashboard'],
};
