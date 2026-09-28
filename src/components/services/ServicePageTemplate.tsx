'use client';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getRelatedPostsForService, toBlogPostSummary } from '@/data/blog-posts';
import { getAdjacentServices, getRelatedServices } from '@/data/services';
import type { Service } from '@/types/types';
import { MotionConfig } from 'framer-motion';
import { ArchitectureVisual } from './ArchitectureVisual';
import { BusinessValue } from './BusinessValue';
import { CapabilityGrid } from './CapabilityGrid';
import { RelatedServices } from './RelatedServices';
import { ServiceCTA } from './ServiceCTA';
import { ServiceFAQ } from './ServiceFAQ';
import { ServiceHero } from './ServiceHero';
import { ServiceNavigation } from './ServiceNavigation';
import { ServiceOverview } from './ServiceOverview';
import { ServiceProblems } from './ServiceProblems';
import { ServiceProcess } from './ServiceProcess';
import { ServiceRelatedBlogs } from './ServiceRelatedBlogs';
import { ServiceTechnologies } from './ServiceTechnologies';
import { ServiceUseCases } from './ServiceUseCases';

/** URL fragment for each category's section on the Explore All Services
 * page — used to make the breadcrumb's category crumb a real, useful link
 * rather than an inert label. Keep in sync with the ids set in
 * `src/app/services/page.tsx`. */
const CATEGORY_ANCHORS: Record<Service['category'], string> = {
  'Cloud & Infrastructure': 'cloud-infrastructure',
  'DevOps & Platform': 'devops-platform',
  'Cloud-Native': 'cloud-native',
  'AI & Security': 'ai-security',
};

/**
 * Renders a complete service page from one `Service` data record.
 * Every one of the 14 service routes renders through this same template —
 * the UI system stays identical across pages while content, capabilities,
 * technologies, process and the architecture diagram change per service.
 *
 * `reducedMotion="user"` makes every Framer Motion animation in the tree
 * (hero, cards, process, architecture, CTA) honor prefers-reduced-motion
 * automatically.
 */
export function ServicePageTemplate({ service }: { service: Service }) {
  const { previous, next } = getAdjacentServices(service);
  const related = getRelatedServices(service);
  const relatedPosts = getRelatedPostsForService(service.slug).map(toBlogPostSummary);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.description,
    url: `https://www.ishatechnologies.in/services/${service.slug}`,
    serviceType: service.title,
    provider: {
      '@id': 'https://www.ishatechnologies.in/#organization',
    },
  };

  return (
    <MotionConfig reducedMotion="user">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-[1280px] mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Services', href: '/services' },
            { label: service.category, href: `/services#${CATEGORY_ANCHORS[service.category]}` },
            { label: service.title, href: `/services/${service.slug}` },
          ]}
        />
      </div>
      <ServiceHero
        eyebrow={service.eyebrow}
        heading={service.heading}
        description={service.description}
        slug={service.slug}
        title={service.title}
      />
      <ServiceOverview
        heading={service.overview.heading}
        paragraphs={service.overview.paragraphs}
        platforms={service.platforms}
      />
      <ServiceProblems problems={service.problems} />
      <CapabilityGrid capabilities={service.capabilities} />
      <ServiceProcess steps={service.process} />
      <ArchitectureVisual nodes={service.architecture} />
      <ServiceTechnologies groups={service.technologies} />
      <ServiceUseCases useCases={service.useCases} />
      <BusinessValue points={service.businessValue} />
      <RelatedServices services={related} />
      <ServiceRelatedBlogs posts={relatedPosts} />
      <ServiceFAQ faqs={service.faqs} />
      <ServiceNavigation previous={previous} next={next} />
      <ServiceCTA heading={service.cta.heading} serviceTitle={service.title} />
    </MotionConfig>
  );
}
