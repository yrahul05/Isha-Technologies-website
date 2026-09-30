import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getViewer } from '@/server/auth/viewer';
import { googleAuthUrl, isGoogleConfigured } from '@/server/google';
import { randomToken, signToken } from '@/server/security/crypto';

export const runtime = 'nodejs';

/**
 * GET /api/portal/google/connect — starts Google OAuth for the signed-in
 * team member. CSRF protection for the OAuth round-trip: a signed state
 * (user id + nonce, 10-minute expiry) that must also match an httpOnly
 * cookie set here.
 */
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL('/portal/login', request.url));
  if (!viewer.isInternal) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!isGoogleConfigured()) return NextResponse.redirect(new URL('/portal/settings?section=google&google=not_configured', request.url));

  const nonce = randomToken(16);
  const returnTo = new URL(request.url).searchParams.get('returnTo');
  const state = signToken({ uid: viewer.id, nonce, returnTo: returnTo?.startsWith('/portal/') ? returnTo : '/portal/settings?section=google' }, 600);
  (await cookies()).set('isha_google_oauth', nonce, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/portal/google', maxAge: 600 });
  return NextResponse.redirect(googleAuthUrl(state));
}
