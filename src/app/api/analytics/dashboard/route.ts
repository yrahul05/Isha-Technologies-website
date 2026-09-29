import { NextRequest, NextResponse } from 'next/server';
import { ANALYTICS_SESSION_COOKIE, verifyAnalyticsSessionValue } from '@/lib/analytics-auth';
import {
  type GA4ReportResult,
  getGA4AccessToken,
  getGA4Credentials,
  runGA4BatchReports,
  runGA4RealtimeActiveUsers,
} from '@/lib/ga4';

/**
 * GET /api/analytics/dashboard — the data behind /analytics: totals,
 * active users right now, top pages, traffic sources and device
 * breakdown for ishatechnologies.in over the last 30 days, read
 * server-side from the GA4 Data API with the same service account as the
 * footer's visitor count (src/lib/ga4.ts).
 *
 * Protected twice: `src/middleware.ts` rejects unauthenticated requests
 * to this exact path before this handler ever runs, and this handler
 * re-checks the same session cookie itself — defense in depth, and it
 * means this route is still safe to call directly even if the
 * middleware matcher is ever changed.
 *
 * Never returns the GA4 service-account credentials, an access token, or
 * the raw Google API payload — only the minimal shape below.
 */

export const runtime = 'nodejs';
export const revalidate = 300; // 5 minutes — a dashboard is checked more often than the footer stat, but still shouldn't call Google on every request.

const DATE_RANGE = { startDate: '30daysAgo', endDate: 'yesterday' };

function dimensionRows(report: GA4ReportResult): { label: string; value: number }[] {
  return (report.rows ?? []).map((row) => ({
    label: row.dimensionValues?.[0]?.value ?? '(not set)',
    value: Number(row.metricValues?.[0]?.value ?? 0),
  }));
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(ANALYTICS_SESSION_COOKIE)?.value;
  if (!(await verifyAnalyticsSessionValue(cookie))) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  const credentials = getGA4Credentials();
  if (!credentials) {
    return NextResponse.json({ status: 'not_configured' });
  }

  try {
    const accessToken = await getGA4AccessToken(credentials.clientEmail, credentials.privateKey);

    const [overview, topPages, trafficSources, devices] = await Promise.all([
      runGA4BatchReports(credentials.propertyId, accessToken, [
        {
          dateRanges: [DATE_RANGE],
          metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
        },
      ]),
      runGA4BatchReports(credentials.propertyId, accessToken, [
        {
          dateRanges: [DATE_RANGE],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 5,
        },
      ]),
      runGA4BatchReports(credentials.propertyId, accessToken, [
        {
          dateRanges: [DATE_RANGE],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 5,
        },
      ]),
      runGA4BatchReports(credentials.propertyId, accessToken, [
        {
          dateRanges: [DATE_RANGE],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        },
      ]),
      // Realtime is fetched below, outside this Promise.all, so a slow or
      // failed realtime call can't take down the rest of the dashboard.
    ]);

    let activeUsers: number | null = null;
    try {
      activeUsers = await runGA4RealtimeActiveUsers(credentials.propertyId, accessToken);
    } catch (err) {
      // Realtime is a nice-to-have on this dashboard, not load-bearing —
      // log it but still return everything else.
      console.error('GA4 realtime active users fetch failed:', err);
    }

    const [totalUsers, sessions, pageViews] = overview[0].rows?.[0]?.metricValues?.map((m) =>
      Number(m.value ?? 0)
    ) ?? [0, 0, 0];

    return NextResponse.json({
      status: 'ok',
      range: 'Last 30 days',
      totals: {
        totalUsers,
        sessions,
        pageViews,
      },
      activeUsers,
      topPages: dimensionRows(topPages[0]).map((row) => ({ path: row.label, views: row.value })),
      trafficSources: dimensionRows(trafficSources[0]).map((row) => ({
        channel: row.label,
        sessions: row.value,
      })),
      devices: dimensionRows(devices[0]).map((row) => ({ category: row.label, sessions: row.value })),
    });
  } catch (err) {
    console.error('GA4 dashboard fetch failed:', err);
    return NextResponse.json({ status: 'error' });
  }
}
