'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * Loads Google Analytics 4 site-wide, only when
 * `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured — otherwise renders
 * nothing and the site behaves exactly as before.
 *
 * The bootstrap script disables gtag's automatic page_view
 * (`send_page_view: false`) and this component's effect sends the page_view
 * itself on every pathname change. That keeps this one effect as the single
 * source of truth for page views, so client-side route changes (which don't
 * reload gtag.js) are tracked without ever double-firing on the initial load.
 *
 * Visitor statistics require an authenticated analytics reporting layer
 * (e.g. the GA4 Data API called server-side with a service account). This
 * file only ever sends events to Google — it never reads them back, and no
 * Google Analytics credentials or tokens are ever exposed in the browser.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window.gtag !== 'function') return;
    window.gtag('config', GA_MEASUREMENT_ID, { page_path: pathname });
  }, [pathname]);

  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
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
