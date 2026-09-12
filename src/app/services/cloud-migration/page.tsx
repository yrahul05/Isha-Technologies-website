import { ServicePageTemplate } from '@/components/services/ServicePageTemplate';
import { buildServiceMetadata, getServiceBySlug } from '@/data/services';
import type { Metadata } from 'next';

const service = getServiceBySlug('cloud-migration')!;

export const metadata: Metadata = buildServiceMetadata(service);

export default function Page() {
  return <ServicePageTemplate service={service} />;
}
