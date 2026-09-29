import { NextResponse } from 'next/server';
import { getGA4AccessToken, getGA4Credentials, runGA4BatchReports } from '@/lib/ga4';

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
 * The JWT-signing/token-exchange/report-fetching logic itself lives in
 * src/lib/ga4.ts, shared with the richer /api/analytics/dashboard route —
 * this route's own behavior and response shape are unchanged.
 *
 * Node.js runtime (Vercel's default serverless function runtime) — used
 * here for the built-in `crypto` module (RS256-signing the service account
 * JWT); no other Node-specific APIs are used.
 */

export const runtime = 'nodejs';
export const revalidate = 1800; // Cache for 30 minutes — stable number, Google isn't called on every page load.

export async function GET() {
  const credentials = getGA4Credentials();

  if (!credentials) {
    // Not configured yet — this is the expected state until the GA4 service
    // account env vars are set in Vercel. Never fake a number.
    return NextResponse.json({ status: 'not_configured' });
  }

  try {
    const accessToken = await getGA4AccessToken(credentials.clientEmail, credentials.privateKey);
    const [sessionsReport] = await runGA4BatchReports(credentials.propertyId, accessToken, [
      { dateRanges: [{ startDate: '30daysAgo', endDate: 'yesterday' }], metrics: [{ name: 'sessions' }] },
    ]);

    const value = sessionsReport.rows?.[0]?.metricValues?.[0]?.value;
    const visits = Number(value);

    if (!Number.isFinite(visits) || visits < 0) {
      throw new Error('GA4 Data API returned an invalid sessions total');
    }

    return NextResponse.json({ status: 'ok', visits });
  } catch (err) {
    // Real error detail stays in the server log — the client only ever
    // sees a generic "error" status, never the private key, access token,
    // or a fake fallback number.
    console.error('GA4 visits fetch failed:', err);
    return NextResponse.json({ status: 'error' });
  }
}
