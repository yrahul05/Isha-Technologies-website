'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { onPortalHost } from '@/lib/portal/client-host';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * Client-side page-view tracking for GA4, on every pathname change.
 *
 * The actual gtag.js script tags live directly in `src/app/layout.tsx`
 * (root layout), not here — `next/script`'s `beforeInteractive` strategy
 * (needed so the tag is present in the raw server-rendered HTML, not only
 * injected after hydration — see the comment in layout.tsx) is only
 * supported when the `<Script>` element is placed directly inside the
 * root layout itself, not in an imported/nested client component like
 * this one. This component's only job is the page-view effect below.
 *
 * The bootstrap script in layout.tsx disables gtag's automatic page_view
 * (`send_page_view: false`), and this component's effect sends the
 * page_view itself on every pathname change. That keeps this one effect
 * as the single source of truth for page views, so client-side route
 * changes (which don't reload gtag.js) are tracked without ever
 * double-firing on the initial load.
 *
 * The footer's "Website Visitors" stat reads an aggregate back out of GA4
 * via the Data API, server-side with a service account — see
 * src/app/api/analytics/visitors/route.ts. This file only ever sends
 * events to Google — it never reads them back, and no Google Analytics
 * credentials or tokens are ever exposed in the browser.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window.gtag !== 'function') return;
    // The private client portal is never reported to GA — its URLs carry
    // record ids and it isn't marketing traffic.
    if (pathname === '/portal' || pathname.startsWith('/portal/') || onPortalHost()) return;
    window.gtag('config', GA_MEASUREMENT_ID, { page_path: pathname });
  }, [pathname]);

  return null;
}

/**
 * Fire a generic, aggregate GA4 event (e.g. `whatsapp_click`,
 * `contact_form_submit`). No-ops when GA4 isn't configured or the gtag
 * script hasn't loaded yet — safe to call from anywhere, including during
 * SSR. `params` must only ever carry non-identifying, categorical values
 * (never a name, email, phone number or message body).
 */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}
