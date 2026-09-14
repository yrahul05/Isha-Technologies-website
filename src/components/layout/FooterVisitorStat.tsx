'use client';

import { useEffect, useState } from 'react';

type VisitorStatState =
  | { status: 'loading' }
  | { status: 'not_configured' }
  | { status: 'error' }
  | { status: 'ok'; visitors: number };

// Standard international thousands grouping (1,248 / 12,540 / 105,284),
// matching the numbers already used elsewhere on the site.
const numberFormatter = new Intl.NumberFormat('en-US');

/**
 * Optional, public dashboard link for the "Website Analytics" fallback
 * card below (e.g. a Cloudflare Web Analytics or GA4 dashboard URL). Not a
 * secret — just a URL — so a plain NEXT_PUBLIC_ var is fine. Deliberately
 * has no default: this component never invents or guesses a dashboard
 * link, so the "View Analytics" link only renders once this is actually
 * set.
 */
const ANALYTICS_DASHBOARD_URL = process.env.NEXT_PUBLIC_ANALYTICS_DASHBOARD_URL;

/**
 * Real, aggregate "Total Users" figure from Google Analytics 4 — read
 * through a secure server-side Route Handler
 * (src/app/api/analytics/visitors/route.ts), never from GA4 credentials or
 * the reporting API directly in the browser. No visitor counting or
 * analytics data lives in this component itself — it only ever displays
 * what that route reports, or a static status card.
 *
 * Renders one of two cards, chosen by what the endpoint reports:
 * - success -> the "Website Visitors" card with the real, cached number.
 * - `not_configured` (GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY not set yet),
 *   `error` (configured but the live Google call failed), or the endpoint
 *   being unreachable -> a "Website Analytics" status card. Traffic is
 *   still genuinely monitored via Cloudflare Web Analytics/RUM on this
 *   domain even when this per-visit GA4 number isn't available, so this
 *   states that rather than showing internal "setup required" /
 *   "unavailable" wording to site visitors. Never a fake or zero number
 *   either way; a "View Analytics" link only appears if
 *   NEXT_PUBLIC_ANALYTICS_DASHBOARD_URL is actually configured.
 *
 * Never uses localStorage/sessionStorage, a random counter, or any
 * client-side visit counting. Public visitor statistics require this
 * authenticated server-side reporting layer — GA4 credentials are never
 * exposed to the browser.
 */
export function FooterVisitorStat() {
  const [state, setState] = useState<VisitorStatState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetch('/api/analytics/visitors')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Request failed'))))
      .then((data: { status?: string; visitors?: number }) => {
        if (cancelled) return;
        if (data.status === 'ok' && typeof data.visitors === 'number') {
          setState({ status: 'ok', visitors: data.visitors });
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

  if (state.status === 'not_configured' || state.status === 'error') {
    return (
      <div className="mt-4 w-full rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Website Analytics
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/50 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
          <p className="text-xs font-medium text-gray-500">Traffic &amp; performance monitored</p>
        </div>
        {ANALYTICS_DASHBOARD_URL && (
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
            className="block h-4 w-12 animate-pulse rounded bg-gray-200 motion-reduce:animate-none"
          />
        )}
        {state.status === 'ok' && (
          <p className="text-base font-bold leading-none tracking-tight text-black">
            {numberFormatter.format(state.visitors)}
          </p>
        )}
      </div>
      {state.status === 'ok' && (
        <p className="mt-1 text-[11px] leading-none text-gray-500">All-time visitors</p>
      )}
    </div>
  );
}
