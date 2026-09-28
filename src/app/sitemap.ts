import { getSortedPublishedBlogPosts } from '@/data/blog-posts';
import { caseStudies } from '@/data/case-studies';
import { services } from '@/data/data';
import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.ishatechnologies.in';

// Build time is used as `lastModified` for every entry: none of this
// content carries a real per-page edit date (the blog/case-study data
// deliberately avoids fabricated historical dates — see
// src/data/blog-posts.ts and src/data/case-studies.ts), and a fresh
// deploy timestamp is a truthful signal rather than an invented one.
const BUILD_TIME = new Date();

/**
 * Static, top-level public pages. Dynamic routes (blog posts, case
 * studies, individual service pages) are appended below, generated
 * directly from the same data modules those pages render from — so the
 * sitemap stays in sync automatically as content is added or removed.
 * API routes, the (legal) route group's URL segment (route groups don't
 * appear in the URL), and anything admin/internal are deliberately never
 * included here.
 */
const staticRoutes: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/services', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/case-studies', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/resources/blogs', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/our-journey', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms-and-conditions', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: BUILD_TIME,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const serviceEntries: MetadataRoute.Sitemap = services.map((service: { link: string }) => ({
    url: `${SITE_URL}${service.link}`,
    lastModified: BUILD_TIME,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const caseStudyEntries: MetadataRoute.Sitemap = caseStudies.map((study) => ({
    url: `${SITE_URL}/case-studies/${study.slug}`,
    lastModified: BUILD_TIME,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // Draft posts are excluded automatically (getSortedPublishedBlogPosts
  // filters on status), and each entry's lastModified is that post's real
  // updatedAt — not the shared build timestamp — so the sitemap accurately
  // reflects when each article actually last changed.
  const blogEntries: MetadataRoute.Sitemap = getSortedPublishedBlogPosts().map((post) => ({
    url: `${SITE_URL}/resources/blogs/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticEntries, ...serviceEntries, ...caseStudyEntries, ...blogEntries];
}
