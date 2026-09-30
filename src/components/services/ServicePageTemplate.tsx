import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getRelatedPostsForService, toBlogPostSummary } from '@/data/blog-posts';
import { getAdjacentServices, getRelatedServices } from '@/data/services';
import type { Service } from '@/types/types';
import { JsonLd } from '@/components/JsonLd';
import { MotionProvider } from '@/components/MotionProvider';
import { RelatedCaseStudy } from '@/components/blog/RelatedCaseStudy';
import { BLOG_VARIANT_STYLES } from '@/data/blog-variants';
import { getRelatedCaseStudySlug } from '@/data/blog-case-study-links';
import { getCaseStudyVariant } from '@/data/case-study-variants';
import { absoluteUrl, organizationReference } from '@/lib/seo';
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

/**
 * Renders a complete service page from one `Service` data record.
 * Every one of the 14 service routes renders through this same template —
 * the UI system stays identical across pages while content, capabilities,
 * technologies, process and the architecture diagram change per service.
 *
 * A Server Component: the service/blog data it reads stays on the server
 * (only the animated leaf components ship to the client), and every
 * section — definition, FAQ answers, related links — is in the initial
 * HTML. `MotionProvider` makes every Framer Motion animation in the tree
 * honor prefers-reduced-motion automatically.
 */
export function ServicePageTemplate({ service }: { service: Service }) {
  const { previous, next } = getAdjacentServices(service);
  const related = getRelatedServices(service);
  const relatedPosts = getRelatedPostsForService(service.slug).map(toBlogPostSummary);

  const relatedCaseStudySlug = getRelatedCaseStudySlug(service.slug);
  const url = absoluteUrl(`/services/${service.slug}`);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: service.title,
    description: service.definition,
    url,
    serviceType: service.title,
    category: service.category,
    image: `${url}/opengraph-image`,
    provider: organizationReference,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };

  return (
    <MotionProvider>
      <JsonLd data={jsonLd} />
      <div className="max-w-[1280px] mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Services', href: '/services' },
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
        title={service.title}
        definition={service.definition}
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
      {relatedCaseStudySlug && (
        <section className="bg-white pb-4">
          <div className="mx-auto max-w-[1280px] px-4">
            <div className="max-w-3xl">
              <RelatedCaseStudy
                visualSlug={service.slug}
                variant={BLOG_VARIANT_STYLES[getCaseStudyVariant(relatedCaseStudySlug)]}
              />
            </div>
          </div>
        </section>
      )}
      <ServiceRelatedBlogs posts={relatedPosts} />
      <ServiceFAQ faqs={service.faqs} />
      <ServiceNavigation previous={previous} next={next} />
      <ServiceCTA heading={service.cta.heading} serviceTitle={service.title} />
    </MotionProvider>
  );
}
