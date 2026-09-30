'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Renders the public site's navbar/footer/WhatsApp button everywhere
 * except the authenticated portal, which has its own application shell.
 * Keeps every public URL and page file exactly where it was.
 */
export function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/portal' || pathname?.startsWith('/portal/')) return null;
  return <>{children}</>;
}
