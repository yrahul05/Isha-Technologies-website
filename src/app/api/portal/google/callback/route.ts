import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getViewer } from '@/server/auth/viewer';
import { connectGoogleAccount } from '@/server/google';
import { safeEqual, verifyToken } from '@/server/security/crypto';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';

/** GET /api/portal/google/callback — Google redirects here after consent. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const viewer = await getViewer();
  if (!viewer) return back('/portal/login');

  const jar = await cookies();
  const cookieNonce = jar.get('isha_google_oauth')?.value ?? '';
  jar.delete('isha_google_oauth');
  const state = verifyToken<{ uid: string; nonce: string; returnTo: string }>(url.searchParams.get('state'));
  if (!state || state.uid !== viewer.id || !cookieNonce || !safeEqual(state.nonce, cookieNonce)) {
    return back('/portal/settings?section=google&google=invalid_state');
  }
  if (url.searchParams.get('error')) return back(`${state.returnTo}${state.returnTo.includes('?') ? '&' : '?'}google=denied`);

  const code = url.searchParams.get('code');
  if (!code) return back('/portal/settings?section=google&google=missing_code');
  try {
    const email = await connectGoogleAccount(viewer.id, code);
    await audit(viewer, 'google.connected', { entityType: 'user', entityId: viewer.id, metadata: { googleEmail: email } });
    return back(`${state.returnTo}${state.returnTo.includes('?') ? '&' : '?'}google=connected`);
  } catch (error) {
    console.error('Google connect failed', error instanceof Error ? error.message : error);
    return back('/portal/settings?section=google&google=failed');
  }
}
