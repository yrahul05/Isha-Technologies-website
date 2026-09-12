import { NextResponse } from 'next/server';

/**
 * GET /api/analytics/visitors — real, aggregate "Total Users" from GA4,
 * read server-side through the Google Analytics Data API. Runs on
 * Cloudflare Pages as an Edge Function (no Node-specific APIs needed —
 * just fetch and Web Crypto, both native to the edge runtime).
 *
 * Reads three SERVER-ONLY environment variables (never NEXT_PUBLIC_ — set
 * them in Cloudflare Pages: Settings -> Environment Variables, for
 * Production and Preview; see docs/analytics-visitor-count.md):
 *
 *   GA4_PROPERTY_ID    — the GA4 property's numeric ID (553855156)
 *   GA4_CLIENT_EMAIL   — the service account's client_email
 *   GA4_PRIVATE_KEY    — the service account's private_key (PEM)
 *
 * If any are missing, this returns { status: 'not_configured' } — never a
 * fake or zero number. If the live Google call fails, it returns
 * { status: 'error' } and logs the real error server-side only. The
 * response never contains credentials, tokens, or anything beyond the
 * aggregate visitor count.
 *
 * `revalidate` caches the result at the edge so Google is not called on
 * every page load — every visitor sees the same cached number until the
 * next refresh.
 */

export const runtime = 'edge';
export const revalidate = 1800; // 30 minutes

const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function base64UrlEncodeBytes(bytes: ArrayBuffer | Uint8Array): string {
  const binary = Array.from(new Uint8Array(bytes))
    .map((b) => String.fromCharCode(b))
    .join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

/** Converts a PEM-encoded PKCS#8 private key into a raw DER ArrayBuffer. */
function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    pemToDer(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

/** Builds and signs a Google service-account JWT for the OAuth2 token exchange. */
async function createSignedJwt(clientEmail: string, privateKeyPem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const claims = {
    iss: clientEmail,
    scope: GA4_SCOPE,
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };

  const unsigned = `${base64UrlEncodeString(JSON.stringify(header))}.${base64UrlEncodeString(
    JSON.stringify(claims)
  )}`;

  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );

  return `${unsigned}.${base64UrlEncodeBytes(signature)}`;
}

/** Exchanges the signed JWT for a short-lived OAuth2 access token. Never persisted. */
async function getAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const jwt = await createSignedJwt(clientEmail, privateKeyPem);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed with status ${res.status}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('Google token exchange response had no access_token');
  }
  return data.access_token;
}

/**
 * Reads GA4's "Total Users" (the all-time visitor figure) via the GA4 Data
 * API. Uses an early, fixed lower-bound start date purely to guarantee the
 * range covers the property's entire history — GA4's Data API has no
 * literal "all time" shorthand, so this is the standard way to express it.
 * It is not a claim about when this property actually started collecting data.
 */
async function fetchTotalUsers(propertyId: string, accessToken: string): Promise<number> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '2015-08-14', endDate: 'today' }],
        metrics: [{ name: 'totalUsers' }],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`GA4 Data API request failed with status ${res.status}`);
  }

  const data = (await res.json()) as {
    rows?: { metricValues?: { value?: string }[] }[];
  };

  const raw = data.rows?.[0]?.metricValues?.[0]?.value;
  const value = raw !== undefined ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

export async function GET() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !privateKey) {
    // Credentials not configured yet — this is the expected state until
    // the Cloudflare Pages environment variables are added. Never fake a
    // number here.
    return NextResponse.json({ status: 'not_configured' });
  }

  try {
    const accessToken = await getAccessToken(clientEmail, privateKey);
    const visitors = await fetchTotalUsers(propertyId, accessToken);
    return NextResponse.json({ status: 'ok', visitors });
  } catch (err) {
    // Real error detail stays in the server log — the client only ever
    // sees a generic "error" status, never a fake fallback number.
    console.error('GA4 visitor count fetch failed:', err);
    return NextResponse.json({ status: 'error' });
  }
}
