import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ExploreServicesCTA } from '@/components/services/explore/ExploreServicesCTA';
import { ExploreServicesHero } from '@/components/services/explore/ExploreServicesHero';
import { ServiceCategorySection } from '@/components/services/explore/ServiceCategorySection';
import { TechnicalStack } from '@/components/services/TechnicalStack';
import { getServicesByCategory } from '@/data/services';
import { JsonLd } from '@/components/JsonLd';
import { absoluteUrl, buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = buildMetadata({
  title: 'Cloud, DevOps & AI Infrastructure Services | Isha Technologies',
  description:
    'All 14 Isha Technologies services: cloud architecture, migration, managed cloud, FinOps, DevOps, DevSecOps, Kubernetes, observability, SRE and cloud security.',
  path: '/services',
});

export default function Page() {
  const categories = getServicesByCategory();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Isha Technologies Services',
    // One continuous 1..14 sequence across all categories — ListItem
    // positions must be unique within a list.
    itemListElement: categories
      .flatMap((group) => group.services)
      .map((service, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: service.title,
        url: absoluteUrl(`/services/${service.slug}`),
      })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-[1280px] px-4 pt-6">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Services', href: '/services' }]} />
      </div>
      <ExploreServicesHero />
      {categories.map((group, idx) => (
        <ServiceCategorySection
          key={group.category}
          category={group.category}
          services={group.services}
          index={idx}
        />
      ))}
      <TechnicalStack />
      <ExploreServicesCTA />
    </>
  );
}
