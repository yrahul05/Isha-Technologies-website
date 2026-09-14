import { NextResponse } from 'next/server';

/**
 * GET /api/analytics/visitors — real zone-level "visits" count for
 * ishatechnologies.in from Cloudflare's GraphQL Analytics API, read
 * server-side.
 *
 * Reads two SERVER-ONLY environment variables (never NEXT_PUBLIC_ — set
 * them as Cloudflare Worker vars/secrets; see docs/analytics-visitor-count.md):
 *
 *   CLOUDFLARE_API_TOKEN — a token scoped to Zone > Analytics > Read for
 *                           the ishatechnologies.in zone. MUST be set as an
 *                           encrypted Worker Secret, never a plain var.
 *   CLOUDFLARE_ZONE_ID   — the zone ID for ishatechnologies.in.
 *
 * If either is missing, this returns { status: 'not_configured' } — never a
 * fake or zero number. If the live Cloudflare call fails, times out, or
 * returns something that isn't a valid count, this returns
 * { status: 'error' } and logs the real error server-side only. The
 * response is always exactly { status, visits? } — never the API token,
 * headers, or any raw Cloudflare payload.
 *
 * Deliberately NOT `runtime = 'edge'` — same reasoning as
 * src/app/api/contact/route.ts. This app is deployed via OpenNext to a
 * single Cloudflare Worker (wrangler.jsonc), not Cloudflare Pages
 * Functions. Under OpenNext, `edge` runtime routes are compiled with
 * Next.js's own Edge Runtime sandbox, whose `process.env` is frozen at
 * build time — it never sees the Worker's real runtime secrets, which only
 * exist at deploy/runtime.
 *
 * DATE RANGE — the last 30 complete UTC days (yesterday back through 30
 * days before that; today is excluded because its data is still
 * accumulating and would make the number jump around intra-day). This
 * sums Cloudflare's per-day `visits` metric (from `httpRequests1dGroups`,
 * the only granularity the GraphQL Analytics API exposes) across that
 * window. Cloudflare defines a "visit" as a session deduplicated *within*
 * a single day; a person visiting on multiple days is counted once per
 * day. So this is genuinely "visits over the last 30 days" — NOT an
 * all-time or cross-day-deduplicated unique-visitor figure — and is
 * labeled that way in the UI (FooterVisitorStat.tsx).
 */

export const runtime = 'nodejs';
export const revalidate = 1800; // Cache for 30 minutes — stable number, Cloudflare not hit on every page load.

const CLOUDFLARE_GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';
const FETCH_TIMEOUT_MS = 10_000;
const WINDOW_DAYS = 30;

// Standard Cloudflare GraphQL Analytics API query for zone-level `visits`,
// grouped by day (https://developers.cloudflare.com/analytics/graphql-api/).
const VISITS_QUERY = `
  query WebsiteVisitsLast30Days($zoneTag: String!, $since: Date!, $until: Date!) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequests1dGroups(
          filter: { date_geq: $since, date_leq: $until }
          limit: 30
          orderBy: [date_ASC]
        ) {
          dimensions {
            date
          }
          sum {
            visits
          }
        }
      }
    }
  }
`;

/** Formats a Date as the UTC calendar date Cloudflare's `Date` scalar expects (YYYY-MM-DD). */
function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** [since, until] = the last 30 complete UTC days, both inclusive, ending yesterday. */
function last30DayRange(): { since: string; until: string } {
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const until = new Date(todayUtc);
  until.setUTCDate(until.getUTCDate() - 1);

  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - (WINDOW_DAYS - 1));

  return { since: toUtcDateString(since), until: toUtcDateString(until) };
}

type GraphQlResponse = {
  data?: {
    viewer?: {
      zones?: {
        httpRequests1dGroups?: { sum?: { visits?: number } }[];
      }[];
    };
  };
  errors?: { message?: string }[];
};

async function fetchVisitsLast30Days(apiToken: string, zoneTag: string): Promise<number> {
  const { since, until } = last30DayRange();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(CLOUDFLARE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: VISITS_QUERY,
        variables: { zoneTag, since, until },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Cloudflare GraphQL API request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Cloudflare GraphQL API request failed with status ${res.status}`);
  }

  const payload = (await res.json()) as GraphQlResponse;

  if (payload.errors?.length) {
    throw new Error(
      `Cloudflare GraphQL API returned errors: ${payload.errors.map((e) => e.message).join('; ')}`
    );
  }

  const groups = payload.data?.viewer?.zones?.[0]?.httpRequests1dGroups;
  if (!Array.isArray(groups)) {
    throw new Error('Cloudflare GraphQL API response missing httpRequests1dGroups');
  }

  const total = groups.reduce((sum, group) => {
    const visits = group?.sum?.visits;
    return sum + (typeof visits === 'number' && Number.isFinite(visits) ? visits : 0);
  }, 0);

  if (!Number.isFinite(total) || total < 0) {
    throw new Error('Cloudflare GraphQL API returned an invalid visits total');
  }

  return total;
}

export async function GET() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneTag = process.env.CLOUDFLARE_ZONE_ID;

  if (!apiToken || !zoneTag) {
    // Not configured yet — this is the expected state until the Cloudflare
    // Worker secrets are set. Never fake a number.
    return NextResponse.json({ status: 'not_configured' });
  }

  try {
    const visits = await fetchVisitsLast30Days(apiToken, zoneTag);
    return NextResponse.json({ status: 'ok', visits });
  } catch (err) {
    // Real error detail stays in the server log — the client only ever
    // sees a generic "error" status, never the token, headers, or a fake
    // fallback number.
    console.error('Cloudflare visits fetch failed:', err);
    return NextResponse.json({ status: 'error' });
  }
}
