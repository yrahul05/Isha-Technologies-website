/**
 * Lightweight, stateless access control for the internal /analytics
 * dashboard — this site has no user accounts or auth system, so this is
 * a single shared password (`ANALYTICS_DASHBOARD_PASSWORD`, server-only)
 * rather than a full auth framework, matching the scope of what's being
 * protected (aggregate GA4 marketing stats, not customer data).
 *
 * The session cookie never contains the password itself — it's an
 * HMAC-SHA256 of a fixed context string, keyed by the password. Anyone
 * holding a valid cookie is trusted for `SESSION_MAX_AGE_SECONDS`; there's
 * no server-side session store, so a session can't be individually
 * revoked before it expires — an acceptable trade-off for a low-stakes,
 * single-shared-password admin gate with no database.
 *
 * Built on the Web Crypto API (`crypto.subtle`, a global in both the
 * Node.js and Edge runtimes) rather than Node's `crypto` module, because
 * `src/middleware.ts` — which verifies the session cookie on every request
 * to the dashboard's data API — always runs on Next.js's Edge Runtime,
 * which does not support Node's `crypto` module at all.
 */

export const ANALYTICS_SESSION_COOKIE = 'analytics_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

const SESSION_CONTEXT = 'isha-technologies-analytics-dashboard';
const encoder = new TextEncoder();

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Parses a hex string into bytes, or `null` if it isn't valid hex —
 * callers treat `null` as "verification fails", never as a match. */
function hexToBuffer(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

/** True if `ANALYTICS_DASHBOARD_PASSWORD` is set — routes use this to
 * distinguish "not configured" from "configured but wrong password",
 * the same never-fake-a-result discipline as the GA4 credential checks. */
export function isAnalyticsAuthConfigured(): boolean {
  return Boolean(process.env.ANALYTICS_DASHBOARD_PASSWORD);
}

/**
 * Plain equality against `ANALYTICS_DASHBOARD_PASSWORD`. This gates a
 * single shared password for an internal, non-sensitive marketing-stats
 * dashboard — not a high-value target, so a network-timing side channel
 * on the one-time login comparison isn't a meaningful risk. The session
 * cookie itself (checked on every subsequent request, see below) uses a
 * proper HMAC and `crypto.subtle.verify`'s built-in constant-time check.
 */
export function verifyAnalyticsPassword(candidate: string): boolean {
  const expected = process.env.ANALYTICS_DASHBOARD_PASSWORD;
  return Boolean(expected) && candidate === expected;
}

/** The signed cookie value to set after a successful password check. */
export async function createAnalyticsSessionValue(): Promise<string> {
  const password = process.env.ANALYTICS_DASHBOARD_PASSWORD;
  if (!password) throw new Error('ANALYTICS_DASHBOARD_PASSWORD is not configured');

  const key = await importHmacKey(password);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(SESSION_CONTEXT));
  return bufferToHex(signature);
}

/** True if a cookie value matches the current password's HMAC signature,
 * checked via `crypto.subtle.verify` (constant-time by design). */
export async function verifyAnalyticsSessionValue(cookieValue: string | undefined): Promise<boolean> {
  const password = process.env.ANALYTICS_DASHBOARD_PASSWORD;
  if (!password || !cookieValue) return false;

  const signature = hexToBuffer(cookieValue);
  if (!signature) return false;

  const key = await importHmacKey(password);
  return crypto.subtle.verify('HMAC', key, signature.buffer as ArrayBuffer, encoder.encode(SESSION_CONTEXT));
}
