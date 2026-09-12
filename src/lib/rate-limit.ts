/**
 * Best-effort in-memory rate limiter for the contact form endpoint.
 *
 * State lives only in the current server instance's memory, so under a
 * multi-instance serverless deployment this limits each instance
 * independently rather than globally. That's an acceptable trade-off for
 * stopping naive repeated submissions without adding an external store —
 * if stricter, distributed limiting is needed later, swap this for a
 * shared store (e.g. Upstash Redis) behind the same `checkRateLimit` shape.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

const hits = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS
): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);
  return true;
}
