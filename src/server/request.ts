import 'server-only';
import { PORTAL_ORIGIN } from '@/lib/portal/host';
import { headers } from 'next/headers';

export type RequestMeta = { ip: string; userAgent: string };

export function metaFromHeaders(h: Headers): RequestMeta {
  const ip =
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('cf-connecting-ip') ||
    'unknown';
  return { ip: ip.slice(0, 64), userAgent: (h.get('user-agent') || '').slice(0, 400) };
}

export async function getRequestMeta(): Promise<RequestMeta> {
  return metaFromHeaders(await headers());
}

/** Public base URL for links in emails and OAuth redirects. */
export function appUrl(): string {
  return (
    process.env.APP_URL ||
    // Production without APP_URL still links to the CRM host, never the public site or a *.vercel.app URL.
    (process.env.VERCEL_ENV === 'production' ? PORTAL_ORIGIN : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ).replace(/\/$/, '');
}

/**
 * CSRF guard for mutating route handlers (Server Actions get Next.js's
 * built-in Origin check). Rejects cross-site requests by comparing the
 * Origin header with the request host.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return request.method === 'GET' || request.method === 'HEAD';
  try {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
