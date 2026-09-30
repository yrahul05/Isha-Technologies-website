'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/portal/invoice-math';

/** Named formatters — functions can't cross the server→client boundary. */
export type ChartFormat = 'number' | 'inr' | 'inr-compact' | 'percent' | 'hours';
const FORMATS: Record<ChartFormat, (n: number) => string> = {
  number: (n) => n.toLocaleString('en-IN'),
  inr: (n) => formatINR(n),
  'inr-compact': (n) => formatINR(n, { compact: true }),
  percent: (n) => `${Math.round(n)}%`,
  hours: (n) => `${n}h`,
};

/**
 * Lightweight SVG charts (no chart library in the bundle). Follows the
 * portal's data-viz rules: single-series in brand blue (so no legend box),
 * columns ≤ 24px with 4px rounded data-ends on a shared baseline, hairline
 * recessive gridlines, a hover tooltip on every mark, text in ink tokens
 * (never the series colour), and a visually hidden table for screen readers.
 */
export function ColumnChart({
  data,
  format: formatKey,
  height = 220,
  ariaLabel,
  highlightLast = true,
}: {
  data: { label: string; value: number; sublabel?: string }[];
  format: ChartFormat;
  height?: number;
  ariaLabel: string;
  highlightLast?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const format = FORMATS[formatKey];
  const width = 640;
  const pad = { top: 16, right: 8, bottom: 28, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const band = innerW / Math.max(1, data.length);
  const barW = Math.min(24, band * 0.56);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="stroke-slate-100" strokeWidth={1} />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[10px] tabular-nums">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + band * i + band / 2;
          const top = y(d.value);
          const h = pad.top + innerH - top;
          const r = Math.min(4, h);
          const active = hover === i;
          const emphasized = hover === null ? highlightLast && i === data.length - 1 : active;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} className="outline-none">
              {/* Oversized hit target: the whole band, full height. */}
              <rect x={cx - band / 2} y={pad.top} width={band} height={innerH} fill="transparent" />
              {active && <rect x={cx - band / 2 + 2} y={pad.top} width={band - 4} height={innerH} className="fill-brand/[0.05]" rx={6} />}
              {h > 0 && (
                <path
                  d={`M${cx - barW / 2},${pad.top + innerH} V${top + r} Q${cx - barW / 2},${top} ${cx - barW / 2 + r},${top} H${cx + barW / 2 - r} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + r} V${pad.top + innerH} Z`}
                  className={cn('transition-[fill] duration-200', emphasized ? 'fill-brand' : 'fill-brand/45')}
                />
              )}
              <text x={cx} y={height - 10} textAnchor="middle" className={cn('text-[10px]', active ? 'fill-slate-900 font-semibold' : 'fill-slate-500')}>
                {d.label}
              </text>
              {i === peak && hover === null && d.value > 0 && (
                <text x={cx} y={top - 6} textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold tabular-nums">
                  {format(d.value)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} className="stroke-slate-200" strokeWidth={1} />
      </svg>
      {hover !== null && data[hover] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `${((pad.left + band * hover + band / 2) / width) * 100}%`, top: `${(y(data[hover].value) / height) * 100}%`, marginTop: -8 }}
        >
          <p className="font-semibold text-slate-900">{data[hover].sublabel ?? data[hover].label}</p>
          <p className="flex items-center gap-1.5 tabular-nums text-slate-600">
            <span className="h-2 w-2 rounded-sm bg-brand" /> {format(data[hover].value)}
          </p>
        </div>
      )}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th>{d.sublabel ?? d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Labelled horizontal bars for distributions (status breakdowns, workload). Identity is carried by the text label. */
export function BarList({
  rows,
  format: formatKey = 'number',
  max: maxOverride,
}: {
  rows: { label: React.ReactNode; value: number; key: string; hint?: string }[];
  format?: ChartFormat;
  max?: number;
}) {
  const format = FORMATS[formatKey];
  const max = maxOverride ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="group" title={r.hint}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-700">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{format(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand/70 transition-[width,background-color] duration-700 ease-out group-hover:bg-brand" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Circular progress ring for a single headline percentage. */
export function ProgressRing({ value, size = 64, label }: { value: number; size?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(pct)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6} className="fill-none stroke-slate-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="fill-none stroke-brand transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-bold tabular-nums text-slate-900">{Math.round(pct)}%</span>
    </div>
  );
}

function niceMax(v: number): number {
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * exp;
}
