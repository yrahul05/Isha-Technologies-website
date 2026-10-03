/** Duration parsing / formatting for time tracking. Entries are stored as whole minutes. */

export const MAX_MINUTES_PER_ENTRY = 16 * 60;
export const MAX_MINUTES_PER_DAY = 20 * 60;

/** Accepts "1.5", "1,5", "1:30", "90m", "2h", "1h30m". Returns whole minutes, or null if unparseable / not positive. */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase().replace(',', '.');
  if (!s) return null;
  let minutes: number | null = null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{1,2}):([0-5]\d)$/))) minutes = Number(m[1]) * 60 + Number(m[2]);
  else if ((m = s.match(/^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/)) && (m[1] || m[2])) minutes = Math.round(Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0));
  else if ((m = s.match(/^\d+(?:\.\d+)?$/))) minutes = Math.round(Number(s) * 60);
  if (minutes === null || !Number.isFinite(minutes) || minutes <= 0) return null;
  return minutes;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function hoursOf(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/** Cost in paise of `minutes` at an hourly rate in paise. */
export function costOf(minutes: number, hourlyPaise: number): number {
  return Math.round((minutes * hourlyPaise) / 60);
}

/** Monday of the week containing the IST date string. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
