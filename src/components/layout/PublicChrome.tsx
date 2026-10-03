'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { onPortalHost } from '@/lib/portal/client-host';

/**
 * Renders the public site's navbar/footer/WhatsApp button everywhere
 * except the authenticated portal, which has its own application shell.
 * Keeps every public URL and page file exactly where it was.
 */
export function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // On the portal subdomain URLs are clean (/dashboard), so also check the host.
  // Before hydration the portal layout hides [data-public-chrome] with CSS.
  const [portalHost, setPortalHost] = useState(false);
  useEffect(() => setPortalHost(onPortalHost()), []);
  if (portalHost || pathname === '/portal' || pathname?.startsWith('/portal/')) return null;
  return <>{children}</>;
}
