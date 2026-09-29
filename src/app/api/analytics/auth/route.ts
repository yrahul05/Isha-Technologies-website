import { NextRequest, NextResponse } from 'next/server';
import {
  ANALYTICS_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createAnalyticsSessionValue,
  isAnalyticsAuthConfigured,
  verifyAnalyticsPassword,
} from '@/lib/analytics-auth';

/**
 * POST /api/analytics/auth — the only way to reach the /analytics
 * dashboard. Checks a submitted password against the server-only
 * `ANALYTICS_DASHBOARD_PASSWORD` env var and, on success, sets an httpOnly
 * session cookie (see src/lib/analytics-auth.ts) — the password itself is
 * never stored in the cookie, never logged, and never echoed back.
 */
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isAnalyticsAuthConfigured()) {
    return NextResponse.json({ status: 'not_configured' }, { status: 503 });
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ status: 'invalid_request' }, { status: 400 });
  }

  if (typeof password !== 'string' || !verifyAnalyticsPassword(password)) {
    return NextResponse.json({ status: 'invalid_password' }, { status: 401 });
  }

  const response = NextResponse.json({ status: 'ok' });
  response.cookies.set(ANALYTICS_SESSION_COOKIE, await createAnalyticsSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
