'use client';

import { getAdjacentServices, getRelatedServices } from '@/data/services';
import type { Service } from '@/types/types';
import { MotionConfig } from 'framer-motion';
import { ArchitectureVisual } from './ArchitectureVisual';
import { BusinessValue } from './BusinessValue';
import { CapabilityGrid } from './CapabilityGrid';
import { RelatedServices } from './RelatedServices';
import { ServiceCTA } from './ServiceCTA';
import { ServiceHero } from './ServiceHero';
import { ServiceNavigation } from './ServiceNavigation';
import { ServiceOverview } from './ServiceOverview';
import { ServiceProcess } from './ServiceProcess';
import { TechnicalStack } from './TechnicalStack';

/**
 * Renders a complete service page from one `Service` data record.
 * Every one of the 10 service routes renders through this same template —
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.description,
    url: `https://ishatechnologies.in/services/${service.slug}`,
    serviceType: service.title,
    provider: {
      '@id': 'https://ishatechnologies.in/#organization',
    },
  };

  return (
    <MotionConfig reducedMotion="user">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ServiceHero
        eyebrow={service.eyebrow}
        heading={service.heading}
        description={service.description}
        slug={service.slug}
      />
      <ServiceOverview
        heading={service.overview.heading}
        paragraphs={service.overview.paragraphs}
        platforms={service.platforms}
      />
      <CapabilityGrid capabilities={service.capabilities} />
      <TechnicalStack />
      <ServiceProcess steps={service.process} />
      <ArchitectureVisual nodes={service.architecture} />
      <BusinessValue points={service.businessValue} />
      <RelatedServices services={related} />
      <ServiceNavigation previous={previous} next={next} />
      <ServiceCTA heading={service.cta.heading} />
    </MotionConfig>
  );
}
