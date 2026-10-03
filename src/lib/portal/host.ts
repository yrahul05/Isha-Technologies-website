/**
 * Portal hostname handling (Edge-safe: no Node APIs).
 *
 * Production: the CRM lives ONLY on https://portal.ishatechnologies.in with
 * clean URLs (/login, /dashboard…). Internally every page still lives under
 * /portal/*, so nothing moves on disk; the middleware rewrites clean → internal
 * on the portal host, and answers 404 for /portal/* (and the CRM API) on every
 * other production host, so the public website no longer exposes any CRM route.
 *
 * Detection does not depend on an environment variable: any host whose name
 * starts with `portal.` is the CRM host (the public site is never served from
 * such a host), and the public production hosts are fixed below. APP_URL is
 * still honoured for building links; locally and on Preview deployments (no
 * APP_URL, not production) the portal keeps working at /portal/*.
 */
export const PORTAL_ORIGIN = 'https://portal.ishatechnologies.in';
const PUBLIC_HOSTS = new Set(['www.ishatechnologies.in', 'ishatechnologies.in']);

const bareHost = (host: string) => host.split(':')[0].trim().toLowerCase();

/** True for the CRM subdomain (portal.…). */
export function isPortalHostName(host: string): boolean {
  return bareHost(host).startsWith('portal.');
}

export function isPublicSiteHost(host: string): boolean {
  return PUBLIC_HOSTS.has(bareHost(host));
}

/** Hostname from APP_URL when it is a portal.* URL (used for link building / local simulation). */
export function portalHost(): string | null {
  const raw = process.env.APP_URL;
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host.startsWith('portal.') ? host : null;
  } catch {
    return null;
  }
}

/** Canonical CRM origin: APP_URL when it is a portal URL, else the production constant on production deployments. */
export function portalOrigin(): string | null {
  const raw = process.env.APP_URL;
  if (raw && portalHost()) return new URL(raw).origin;
  return process.env.VERCEL_ENV === 'production' ? PORTAL_ORIGIN : null;
}

/** On these hosts the old /portal/* CRM paths no longer exist (404). */
export function legacyPortalGone(host: string): boolean {
  return isPublicSiteHost(host) || portalOrigin() !== null;
}

/** Clean URL → internal route, for the few URLs whose name differs. */
const CLEAN_TO_INTERNAL: Record<string, string> = { '/ai': '/assistant' };
const INTERNAL_TO_CLEAN: Record<string, string> = { '/assistant': '/ai' };
/** Clean URLs that have no page of their own and forward elsewhere. */
export const CLEAN_REDIRECTS: Record<string, string> = { '/payments': '/invoices' };

export function internalPath(clean: string): string {
  const [first, ...rest] = clean.split('/').filter(Boolean);
  const head = CLEAN_TO_INTERNAL[`/${first ?? ''}`];
  const path = head ? `${head}${rest.length ? `/${rest.join('/')}` : ''}` : clean;
  return `/portal${path === '/' ? '' : path}`;
}

/** /portal/assistant/x → /ai/x, /portal/tasks → /tasks, /portal → /dashboard. */
export function cleanPath(internal: string): string {
  const stripped = internal.replace(/^\/portal/, '') || '/dashboard';
  const [first, ...rest] = stripped.split('/').filter(Boolean);
  const head = INTERNAL_TO_CLEAN[`/${first ?? ''}`];
  return head ? `${head}${rest.length ? `/${rest.join('/')}` : ''}` : stripped;
}

/** Pages reachable without a session, as internal paths. */
export const PUBLIC_PORTAL_PATHS = ['/portal/login', '/portal/offline', '/portal/sw.js', '/portal/manifest'];
