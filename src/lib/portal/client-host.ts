/**
 * Browser-side check: are we on the private CRM subdomain (portal.…)?
 * Needed because usePathname() reports the clean URL (/dashboard) there, which
 * the /portal prefix checks in the public chrome and analytics can't see.
 * Client-only — returns false during SSR.
 */
export function onPortalHost(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.toLowerCase().startsWith('portal.');
}
