import type { Metadata } from 'next';

const SITE_NAME = 'Isha Technologies';

/**
 * Builds title + description + canonical + Open Graph + Twitter card
 * metadata from one set of values, so a page's OG/Twitter tags always
 * match its own `<title>`/description instead of silently inheriting the
 * root layout's (homepage) Open Graph block — which is what happens to
 * any page that only sets `title`/`description`/`alternates.canonical`
 * and nothing else.
 *
 * Deliberately does not set `openGraph.images`/`twitter.images` — Next.js
 * automatically applies the nearest opengraph-image file-convention route
 * (src/app/opengraph-image.tsx, or a page's own more specific one) unless
 * explicit metadata overrides it. Setting a path here previously pointed
 * at /og-image.png, which was never actually added to public/, so every
 * page using this helper had a broken social-share image.
 */
export function buildMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      siteName: SITE_NAME,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
