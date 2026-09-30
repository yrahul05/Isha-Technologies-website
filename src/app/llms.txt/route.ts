import { getSortedPublishedBlogPosts } from '@/data/blog-posts';
import { caseStudies } from '@/data/case-studies';
import {
  CONTACT_EMAIL_ADDRESS,
  CONTACT_LOCATION,
  CONTACT_PHONE_DISPLAY,
} from '@/data/contact';
import { getServicesByCategory } from '@/data/services';
import { SITE_URL, absoluteUrl } from '@/lib/seo';

/**
 * /llms.txt — an optional, plain-Markdown overview of the site for LLM-based
 * tools (llmstxt.org convention). Purely informational: it doesn't affect
 * crawling or indexing, and it isn't a ranking or visibility guarantee for
 * any search or AI product. Generated at build time from the same data
 * modules the pages render from, so it can't drift from the real content.
 */
export const dynamic = 'force-static';

export function GET() {
  const lines: string[] = [
    '# Isha Technologies',
    '',
    `> Isha Technologies is a cloud and DevOps engineering company based in ${CONTACT_LOCATION}, founded in 2026. It designs, automates and operates cloud infrastructure — cloud architecture and migration, CI/CD and infrastructure as code, Kubernetes, security, observability and site reliability engineering.`,
    '',
    `Canonical website: ${SITE_URL}`,
    '',
    'Case studies on this site are representative engineering scenarios (reference architectures), not verified client engagements, and contain no client names or performance metrics.',
    '',
    '## Services',
    '',
  ];

  for (const group of getServicesByCategory()) {
    lines.push(`### ${group.category}`, '');
    for (const service of group.services) {
      lines.push(
        `- [${service.title}](${absoluteUrl(`/services/${service.slug}`)}): ${service.definition}`
      );
    }
    lines.push('');
  }

  lines.push('## Technical articles', '');
  for (const post of getSortedPublishedBlogPosts()) {
    lines.push(
      `- [${post.title}](${absoluteUrl(`/resources/blogs/${post.slug}`)}): ${post.metaDescription ?? post.excerpt}`
    );
  }

  lines.push('', '## Technical scenarios', '');
  for (const study of caseStudies) {
    lines.push(
      `- [${study.title}](${absoluteUrl(`/case-studies/${study.slug}`)}): ${study.seo.description}`
    );
  }

  lines.push(
    '',
    '## Company',
    '',
    `- [About](${absoluteUrl('/about')}): Team, focus areas and engineering principles`,
    `- [Our Journey](${absoluteUrl('/our-journey')}): How the company started`,
    `- [All services](${absoluteUrl('/services')})`,
    `- [Blog](${absoluteUrl('/resources/blogs')})`,
    `- [Contact](${absoluteUrl('/contact')}): ${CONTACT_EMAIL_ADDRESS} · ${CONTACT_PHONE_DISPLAY}`,
    ''
  );

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
