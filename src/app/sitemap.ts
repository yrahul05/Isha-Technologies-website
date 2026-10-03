import { getSortedPublishedBlogPosts } from '@/data/blog-posts';
import { caseStudies } from '@/data/case-studies';
import { services } from '@/data/services';
import { absoluteUrl } from '@/lib/seo';
import type { MetadataRoute } from 'next';

type ChangeFrequency = MetadataRoute.Sitemap[number]['changeFrequency'];

/**
 * Static, top-level public pages. Dynamic routes (service pages, case
 * studies, blog posts) are appended below from the same data modules those
 * pages render from, so the sitemap stays in sync automatically. API
 * routes, the private /analytics dashboard, the CRM (a separate host, portal.ishatechnologies.in), redirect-only legacy service
 * URLs (next.config.ts) and draft posts are never included.
 */
const staticRoutes: {
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
}[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/services', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/case-studies', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/our-journey', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/free-cloud-assessment', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms-and-conditions', changeFrequency: 'yearly', priority: 0.3 },
];

/**
 * `lastModified` is only emitted where a real content date exists: each
 * blog post's own `updatedAt`, and the blog index (whose content changes
 * exactly when its newest post does). Static pages, services and case
 * studies carry no per-page edit date in the content model, so they omit
 * `lastModified` rather than claiming every page changed on every deploy.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getSortedPublishedBlogPosts();
  const blogIndexLastModified = posts.reduce<Date | undefined>(
    (latest, post) => {
      const updated = new Date(post.updatedAt);
      return !latest || updated > latest ? updated : latest;
    },
    undefined
  );

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const blogIndexEntry: MetadataRoute.Sitemap[number] = {
    url: absoluteUrl('/resources/blogs'),
    lastModified: blogIndexLastModified,
    changeFrequency: 'weekly',
    priority: 0.7,
  };

  const serviceEntries: MetadataRoute.Sitemap = services.map((service) => ({
    url: absoluteUrl(`/services/${service.slug}`),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const caseStudyEntries: MetadataRoute.Sitemap = caseStudies.map((study) => ({
    url: absoluteUrl(`/case-studies/${study.slug}`),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // Drafts are excluded by getSortedPublishedBlogPosts (filters on status).
  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/resources/blogs/${post.slug}`),
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [
    ...staticEntries,
    blogIndexEntry,
    ...serviceEntries,
    ...caseStudyEntries,
    ...blogEntries,
  ];
}
