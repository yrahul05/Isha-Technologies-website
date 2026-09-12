/**
 * Shared "is this nav item active" logic for the navbar (desktop + mobile).
 *
 * Exact match for `/`, otherwise exact match OR a nested route
 * (`pathname` starts with `href + '/'`) — so `/services` is active on
 * `/services/kubernetes` too, without `/` or `/about` ever matching
 * everything.
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True if `pathname` matches any of the given root hrefs (see `isRouteActive`). */
export function isAnyRouteActive(pathname: string, hrefs: string[]): boolean {
  return hrefs.some((href) => isRouteActive(pathname, href));
}
