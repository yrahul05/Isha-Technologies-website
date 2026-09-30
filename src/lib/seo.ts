import type { Metadata } from 'next';

/**
 * The one canonical origin for the whole site. Every canonical URL,
 * og:url, sitemap entry, robots.txt sitemap line and JSON-LD URL is built
 * from this constant — never from a hardcoded string — so the site can't
 * drift between `www` and the bare apex domain. The apex domain
 * (ishatechnologies.in) permanently redirects here (see next.config.ts).
 */
export const SITE_URL = 'https://www.ishatechnologies.in';
export const SITE_NAME = 'Isha Technologies';

/** Stable JSON-LD node ids, declared once in the root layout's @graph and
 * referenced (not re-declared) by page-level structured data. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const LOGO_URL = `${SITE_URL}/ISHA-TECHNO-LG.png`;

/**
 * Site-wide default Open Graph image — the generated route from
 * src/app/opengraph-image.tsx. Routes with their own opengraph-image file
 * (services, blog posts, case studies) don't use buildMetadata(), so they
 * keep their more specific image.
 */
export const DEFAULT_OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'Isha Technologies — Cloud & DevOps Infrastructure Engineering',
};

/** Absolute canonical URL for a site path ('/' → the bare origin, matching
 * how Next.js renders the homepage canonical and the sitemap entry). */
export function absoluteUrl(path: string): string {
  if (path === '/' || path === '') return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Minimal reference to the root-layout Organization node, safe to embed in
 * any page's JSON-LD (the name/url are included so the node still resolves
 * if a consumer doesn't join on @id). */
export const organizationReference = {
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: SITE_NAME,
  url: SITE_URL,
} as const;

/**
 * Builds title + description + canonical + Open Graph + Twitter card
 * metadata from one set of values, so a page's OG/Twitter tags always
 * match its own `<title>`/description.
 *
 * `openGraph.images` is set explicitly: once a page defines its own
 * `openGraph` object, Next.js no longer carries the root segment's
 * file-based opengraph-image down to it — which is exactly how /about,
 * /services, /resources/blogs, /case-studies, /contact and /our-journey
 * previously shipped with no og:image at all.
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
      locale: 'en_IN',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}
