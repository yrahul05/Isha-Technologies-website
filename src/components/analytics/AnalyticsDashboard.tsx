'use client';

import {
  Activity,
  Eye,
  FileText,
  Globe,
  Laptop,
  Smartphone,
  Tablet,
  Users,
  Waypoints,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type DashboardData = {
  status: 'ok';
  range: string;
  totals: { totalUsers: number; sessions: number; pageViews: number };
  activeUsers: number | null;
  topPages: { path: string; views: number }[];
  trafficSources: { channel: string; sessions: number }[];
  devices: { category: string; sessions: number }[];
};

type DashboardState =
  | { status: 'loading' }
  | { status: 'not_configured' }
  | { status: 'error' }
  | DashboardData;

const numberFormatter = new Intl.NumberFormat('en-US');

const DEVICE_ICONS: Record<string, typeof Laptop> = {
  desktop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
};

function StatCard({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {caption && <p className="mt-1 text-[11px] text-slate-400">{caption}</p>}
    </div>
  );
}

function RankedList({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof FileText;
  rows: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand" strokeWidth={1.75} />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No data for this period yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-700" title={row.label}>
                  {row.label}
                </span>
                <span className="shrink-0 font-semibold text-slate-900">
                  {numberFormatter.format(row.value)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand/70"
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AnalyticsDashboard() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetch('/api/analytics/dashboard')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Request failed'))))
      .then((data: DashboardState) => {
        if (!cancelled) setState(data);
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  if (state.status === 'not_configured' || state.status === 'error') {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-10 text-center">
        <p className="text-sm font-semibold text-slate-700">
          {state.status === 'not_configured'
            ? 'GA4 reporting isn’t configured yet.'
            : 'Analytics data is temporarily unavailable.'}
        </p>
        <p className="mt-1.5 text-xs text-slate-500">
          {state.status === 'not_configured'
            ? 'Set GA4_PROPERTY_ID, GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY — see docs/analytics-visitor-count.md.'
            : 'The GA4 Data API request failed or timed out. Try again shortly.'}
        </p>
      </div>
    );
  }

  const data = state;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Visitors"
          value={numberFormatter.format(data.totals.totalUsers)}
          caption={data.range}
        />
        <StatCard
          icon={Activity}
          label="Active Users Now"
          value={data.activeUsers === null ? '—' : numberFormatter.format(data.activeUsers)}
          caption="Last 30 minutes"
        />
        <StatCard
          icon={Eye}
          label="Page Views"
          value={numberFormatter.format(data.totals.pageViews)}
          caption={data.range}
        />
        <StatCard
          icon={Waypoints}
          label="Sessions"
          value={numberFormatter.format(data.totals.sessions)}
          caption={data.range}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankedList
          title="Top Pages"
          icon={FileText}
          rows={data.topPages.map((p) => ({ label: p.path, value: p.views }))}
        />
        <RankedList
          title="Traffic Sources"
          icon={Globe}
          rows={data.trafficSources.map((s) => ({ label: s.channel, value: s.sessions }))}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Devices</h2>
        {data.devices.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No data for this period yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {data.devices.map((device) => {
              const Icon = DEVICE_ICONS[device.category.toLowerCase()] ?? Laptop;
              return (
                <div
                  key={device.category}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold capitalize text-slate-900">
                      {device.category}
                    </p>
                    <p className="text-xs text-slate-500">
                      {numberFormatter.format(device.sessions)} sessions
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
