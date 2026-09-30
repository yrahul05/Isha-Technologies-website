/** Formatting helpers for the portal — IST everywhere, Indian number grouping. */
const TZ = 'Asia/Kolkata';

export function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Plain `YYYY-MM-DD` dates are calendar dates, not instants — anchor at IST noon.
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+05:30`) : new Date(value);
}

export function fmtDate(value: Date | string | null | undefined, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', {
    timeZone: TZ,
    day: 'numeric',
    month: style === 'short' ? 'short' : style === 'long' ? 'long' : 'short',
    year: style === 'short' ? undefined : 'numeric',
  });
}

export function fmtDateTime(value: Date | string | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleString('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function fmtTime(value: Date | string | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
}

export function relativeTime(value: Date | string | null | undefined, now = Date.now()): string {
  const d = toDate(value);
  if (!d) return '—';
  const diff = d.getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 86_400_000],
    ['month', 30 * 86_400_000],
    ['week', 7 * 86_400_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  for (const [unit, ms] of units) if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  return 'just now';
}

/** Today's date in IST as YYYY-MM-DD. */
export function todayIST(offsetDays = 0): string {
  const d = new Date(Date.now() + 5.5 * 3_600_000 + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  return Math.round((toDate(date)!.getTime() - toDate(todayIST())!.getTime()) / 86_400_000);
}

export function humanize(value: string | null | undefined): string {
  if (!value) return '—';
  const s = value.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
