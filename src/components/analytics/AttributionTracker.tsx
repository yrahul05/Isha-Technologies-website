'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const KEY = 'isha_attribution';
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/**
 * First-touch marketing attribution for lead forms. Stores the first
 * visit's UTM parameters, external referrer and landing page in this
 * browser only; it's attached to a submission only when the visitor
 * submits a lead form (assessment / contact). A later visit carrying new
 * UTM parameters updates the record (so campaign clicks aren't lost).
 */
export function AttributionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      // Read the query string directly (not useSearchParams) so public pages
      // stay fully static without a Suspense boundary.
      const params = new URLSearchParams(window.location.search);
      const existing = localStorage.getItem(KEY);
      const hasUtm = UTM.some((k) => params.get(k));
      if (existing && !hasUtm) return;
      const data: Record<string, string> = { landingPage: pathname, firstSeen: new Date().toISOString() };
      for (const k of UTM) {
        const v = params.get(k);
        if (v) data[k] = v.slice(0, 200);
      }
      if (document.referrer && !document.referrer.startsWith(location.origin)) data.referrer = document.referrer.slice(0, 300);
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable — attribution is optional */
    }
  }, [pathname]);

  return null;
}

export function readAttribution(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}
