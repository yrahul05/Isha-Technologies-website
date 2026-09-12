import type { Metadata } from 'next';

const SITE_NAME = 'Isha Technologies';
const DEFAULT_OG_IMAGE = '/og-image.png';

/**
 * Builds title + description + canonical + Open Graph + Twitter card
 * metadata from one set of values, so a page's OG/Twitter tags always
 * match its own `<title>`/description instead of silently inheriting the
 * root layout's (homepage) Open Graph block — which is what happens to
 * any page that only sets `title`/`description`/`alternates.canonical`
 * and nothing else.
 */
export function buildMetadata({
  title,
  description,
  path,
  ogAlt,
}: {
  title: string;
  description: string;
  path: string;
  ogAlt?: string;
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
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: ogAlt ?? title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}
