import { createSign } from 'crypto';
import { NextResponse } from 'next/server';

/**
 * GET /api/analytics/visitors — real "sessions over the last 30 days" count
 * for ishatechnologies.in from the Google Analytics 4 Data API, read
 * server-side using a service account (not the Cloudflare GraphQL
 * Analytics API this route used before the Vercel migration — that
 * required Cloudflare Worker bindings that don't exist on Vercel).
 *
 * Reads three SERVER-ONLY environment variables (never NEXT_PUBLIC_ — set
 * them as Vercel Environment Variables; see docs/analytics-visitor-count.md):
 *
 *   GA4_PROPERTY_ID  — the GA4 property ID (Admin -> Property Settings),
 *                      e.g. "123456789". Not secret, but kept server-side.
 *   GA4_CLIENT_EMAIL — the service account's client_email, granted Viewer
 *                      access on the GA4 property.
 *   GA4_PRIVATE_KEY  — the service account's private_key. MUST be set as a
 *                      Vercel "Sensitive" (encrypted) env var, never a
 *                      plain one. Literal `\n` sequences in the pasted
 *                      value are normalized to real newlines below.
 *
 * If any is missing, this returns { status: 'not_configured' } — never a
 * fake or zero number. If the live Google API call fails, times out, or
 * returns something that isn't a valid count, this returns
 * { status: 'error' } and logs the real error server-side only. The
 * response is always exactly { status, visits? } — never the private key,
 * an access token, or any raw Google API payload.
 *
 * Node.js runtime (Vercel's default serverless function runtime) — used
 * here for the built-in `crypto` module (RS256-signing the service account
 * JWT); no other Node-specific APIs are used.
 */

export const runtime = 'nodejs';
export const revalidate = 1800; // Cache for 30 minutes — stable number, Google isn't called on every page load.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ANALYTICS_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const FETCH_TIMEOUT_MS = 10_000;

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

/** Builds and signs a service-account JWT for the OAuth2 JWT-bearer flow
 * (https://developers.google.com/identity/protocols/oauth2/service-account). */
function createServiceAccountJwt(clientEmail: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: clientEmail,
    scope: ANALYTICS_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(privateKey);
  return `${unsigned}.${base64url(signature)}`;
}

/** Exchanges a signed service-account JWT for a short-lived OAuth2 access token. */
async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const jwt = createServiceAccountJwt(clientEmail, privateKey);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error('Google token exchange response missing access_token');
  }

  return payload.access_token;
}

type GA4RunReportResponse = {
  rows?: { metricValues?: { value?: string }[] }[];
};

/** Sessions over the last 30 complete days (GA4's relative date keywords
 * handle the date math), via the GA4 Data API's runReport endpoint. */
async function fetchSessionsLast30Days(propertyId: string, accessToken: string): Promise<number> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'yesterday' }],
        metrics: [{ name: 'sessions' }],
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );

  if (!res.ok) {
    throw new Error(`GA4 Data API request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as GA4RunReportResponse;
  const value = payload.rows?.[0]?.metricValues?.[0]?.value;
  const sessions = Number(value);

  if (!Number.isFinite(sessions) || sessions < 0) {
    throw new Error('GA4 Data API returned an invalid sessions total');
  }

  return sessions;
}

export async function GET() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const rawPrivateKey = process.env.GA4_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !rawPrivateKey) {
    // Not configured yet — this is the expected state until the GA4 service
    // account env vars are set in Vercel. Never fake a number.
    return NextResponse.json({ status: 'not_configured' });
  }

  // Env vars are single-line, so a pasted PEM's newlines are usually escaped
  // as literal "\n" — normalize them back to real newlines. A value that
  // already has real newlines (e.g. pasted as-is into Vercel's multi-line
  // input) passes through unchanged.
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  try {
    const accessToken = await getAccessToken(clientEmail, privateKey);
    const visits = await fetchSessionsLast30Days(propertyId, accessToken);
    return NextResponse.json({ status: 'ok', visits });
  } catch (err) {
    // Real error detail stays in the server log — the client only ever
    // sees a generic "error" status, never the private key, access token,
    // or a fake fallback number.
    console.error('GA4 visits fetch failed:', err);
    return NextResponse.json({ status: 'error' });
  }
}
