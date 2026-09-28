import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ExploreServicesCTA } from '@/components/services/explore/ExploreServicesCTA';
import { ExploreServicesHero } from '@/components/services/explore/ExploreServicesHero';
import { ServiceCategorySection } from '@/components/services/explore/ServiceCategorySection';
import { TechnicalStack } from '@/components/services/TechnicalStack';
import { getServicesByCategory } from '@/data/services';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Cloud, DevOps & AI Infrastructure Solutions | Isha Technologies',
    description:
      'Explore all 14 Isha Technologies services across Cloud & Infrastructure, DevOps & Platform, Cloud-Native and AI & Security — cloud architecture, DevOps automation, Kubernetes, observability, reliability engineering and cloud security.',
    path: '/services',
  }),
  keywords:
    'Cloud Solutions, Cloud Migration, Managed Cloud, Cloud Cost Optimization, FinOps, DevOps Solutions, DevSecOps, Platform Engineering, Infrastructure as Code, GitOps, Kubernetes, Observability, Site Reliability Engineering, AIOps, AI Cloud Infrastructure, Cloud Security',
};

const SITE_URL = 'https://www.ishatechnologies.in';

export default function Page() {
  const categories = getServicesByCategory();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Isha Technologies Services',
    itemListElement: categories.flatMap((group) =>
      group.services.map((service, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: service.title,
        url: `${SITE_URL}/services/${service.slug}`,
      }))
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
