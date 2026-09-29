import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { AnalyticsLoginForm } from '@/components/analytics/AnalyticsLoginForm';
import { ANALYTICS_SESSION_COOKIE, verifyAnalyticsSessionValue } from '@/lib/analytics-auth';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

// Internal dashboard — never indexed, never linked from navigation/footer/
// sitemap. Reachable only by someone who knows the URL and the password.
export const metadata: Metadata = {
  title: 'Analytics | Isha Technologies',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const cookieStore = await cookies();
  const isAuthenticated = await verifyAnalyticsSessionValue(cookieStore.get(ANALYTICS_SESSION_COOKIE)?.value);

  if (!isAuthenticated) {
    return <AnalyticsLoginForm />;
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10">
      <div className="mb-6">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand">Internal</span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Website Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Live GA4 data for ishatechnologies.in — visible to anyone with the dashboard password.
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
