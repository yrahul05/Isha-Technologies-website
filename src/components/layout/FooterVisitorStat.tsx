'use client';

import { useEffect, useState } from 'react';

type VisitorStatState =
  | { status: 'loading' }
  | { status: 'not_configured' }
  | { status: 'error' }
  | { status: 'ok'; visits: number };

// Standard international thousands grouping (1,248 / 12,540 / 105,284),
// matching the numbers already used elsewhere on the site.
const numberFormatter = new Intl.NumberFormat('en-US');

/**
 * Optional, public dashboard link for the "Analytics unavailable" fallback
 * card below (e.g. a Cloudflare dashboard URL). Not a secret — just a URL —
 * so a plain NEXT_PUBLIC_ var is fine. Deliberately has no default: this
 * component never invents or guesses a dashboard link, so the "View
 * Analytics" link only renders once this is actually set.
 */
const ANALYTICS_DASHBOARD_URL = process.env.NEXT_PUBLIC_ANALYTICS_DASHBOARD_URL;

/**
 * Real "visits over the last 30 days" figure for ishatechnologies.in from
 * Cloudflare's GraphQL Analytics API, read through a secure server-side
 * Route Handler (src/app/api/analytics/visitors/route.ts). The Cloudflare
 * API token is never present in this component, in any client bundle, or
 * anywhere in the browser — this only ever displays what that route
 * reports.
 *
 * Renders one of two cards, chosen by what the endpoint reports:
 * - `ok` -> "WEBSITE VISITORS" with the real, cached count ("<n> Visits").
 * - `not_configured` (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID not set
 *   yet), `error` (configured but the live Cloudflare call failed,
 *   timed out, or returned something invalid), or the endpoint being
 *   unreachable -> "WEBSITE VISITORS" / "Analytics unavailable". Never a
 *   fake or zero number — 0 is only ever shown if Cloudflare genuinely
 *   reports 0 visits for the window.
 *
 * Never uses localStorage/sessionStorage, a random counter, or any
 * client-side visit counting. This is independent of, and does not
 * change, GA4 page-view tracking or the Cloudflare Web Analytics beacon —
 * both keep running exactly as before regardless of what this card shows.
 */
export function FooterVisitorStat() {
  const [state, setState] = useState<VisitorStatState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetch('/api/analytics/visitors')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Request failed'))))
      .then((data: { status?: string; visits?: number }) => {
        if (cancelled) return;
        if (data.status === 'ok' && typeof data.visits === 'number') {
          setState({ status: 'ok', visits: data.visits });
        } else if (data.status === 'error') {
          setState({ status: 'error' });
        } else {
          setState({ status: 'not_configured' });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'not_configured' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isUnavailable = state.status === 'not_configured' || state.status === 'error';

  return (
    <div className="mt-4 w-full rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Website Visitors
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/50 opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
        </span>
        {state.status === 'loading' && (
          <span
            aria-hidden="true"
            className="block h-4 w-16 animate-pulse rounded bg-gray-200 motion-reduce:animate-none"
          />
        )}
        {state.status === 'ok' && (
          <p className="text-base font-bold leading-none tracking-tight text-black">
            {numberFormatter.format(state.visits)} Visits
          </p>
        )}
        {isUnavailable && (
          <p className="text-sm font-medium leading-none text-gray-500">Analytics unavailable</p>
        )}
      </div>
      {state.status === 'ok' && (
        <p className="mt-1 text-[11px] leading-none text-gray-500">Last 30 days</p>
      )}
      {isUnavailable && ANALYTICS_DASHBOARD_URL && (
        <a
          href={ANALYTICS_DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-[11px] font-medium text-brand leading-none hover:underline"
        >
          View Analytics
        </a>
      )}
    </div>
  );
}
