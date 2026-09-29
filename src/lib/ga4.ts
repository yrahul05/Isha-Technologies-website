import { createSign } from 'crypto';

/**
 * Shared GA4 Data API helpers — service-account JWT signing and access
 * token exchange, used by every server-side route that reads an aggregate
 * back out of GA4 (the footer's visitor count, the /analytics dashboard).
 *
 * Never imported by client components. The service account's private key
 * only ever exists inside Next.js Route Handlers running on the server
 * (Vercel serverless functions, `runtime = 'nodejs'` for the built-in
 * `crypto` module) — see docs/analytics-visitor-count.md for the full
 * security write-up and setup steps.
 */

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
export async function getGA4AccessToken(clientEmail: string, privateKey: string): Promise<string> {
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

/** A pasted PEM's newlines usually arrive as literal `\n` in a single-line
 * env var — normalize back to real newlines. A value that already has
 * real newlines passes through unchanged. */
export function normalizeGA4PrivateKey(rawPrivateKey: string): string {
  return rawPrivateKey.replace(/\\n/g, '\n');
}

/** Reads the three GA4 service-account env vars, returning `null` if any
 * is missing — callers use this to distinguish "not configured" from a
 * live API failure, and never fake a number in the former case. */
export function getGA4Credentials(): { propertyId: string; clientEmail: string; privateKey: string } | null {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const rawPrivateKey = process.env.GA4_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !rawPrivateKey) return null;

  return { propertyId, clientEmail, privateKey: normalizeGA4PrivateKey(rawPrivateKey) };
}

export type GA4Row = { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] };
export type GA4ReportResult = { rows?: GA4Row[] };

type GA4ReportRequest = {
  dateRanges?: { startDate: string; endDate: string }[];
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  orderBys?: { metric?: { metricName: string }; desc?: boolean }[];
  limit?: number;
};

/** Runs several GA4 report requests in a single HTTP call via the Data
 * API's batchRunReports endpoint — used for the dashboard's overview,
 * top-pages, traffic-source and device-breakdown reports together. */
export async function runGA4BatchReports(
  propertyId: string,
  accessToken: string,
  requests: GA4ReportRequest[]
): Promise<GA4ReportResult[]> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );

  if (!res.ok) {
    throw new Error(`GA4 Data API batchRunReports failed with status ${res.status}`);
  }

  const payload = (await res.json()) as { reports?: GA4ReportResult[] };
  if (!payload.reports) {
    throw new Error('GA4 Data API batchRunReports response missing reports');
  }

  return payload.reports;
}

/** Active users right now (last 30 minutes), via the Data API's realtime
 * report endpoint — a different endpoint from historical reports, with no
 * date range (GA4 realtime is always "now"). */
export async function runGA4RealtimeActiveUsers(propertyId: string, accessToken: string): Promise<number> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metrics: [{ name: 'activeUsers' }] }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );

  if (!res.ok) {
    throw new Error(`GA4 Data API runRealtimeReport failed with status ${res.status}`);
  }

  const payload = (await res.json()) as GA4ReportResult;
  const value = payload.rows?.[0]?.metricValues?.[0]?.value;
  const activeUsers = Number(value ?? 0);

  if (!Number.isFinite(activeUsers) || activeUsers < 0) {
    throw new Error('GA4 Data API returned an invalid activeUsers value');
  }

  return activeUsers;
}
