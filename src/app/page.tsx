import { HomePage } from '@/components/homepage';
import { buildMetadata } from '@/lib/seo';

import { Metadata } from 'next';

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Isha Technologies | Managed Cloud & DevOps Solutions',
    description:
      'Managed Cloud & DevOps Solutions from Isha Technologies — expert infrastructure support without building everything in-house. Cloud architecture, DevOps automation, Kubernetes, security, migration and observability.',
    path: '/',
  }),
  keywords:
    'Isha Technologies, cloud infrastructure, DevOps solutions, Kubernetes, cloud migration, managed cloud, cloud cost optimization, DevSecOps, platform solutions, site reliability, observability, infrastructure automation, AWS Advanced Tier Services Partner, Google Cloud Partner, Microsoft Azure Partner',
};

export default function page() {
  return <HomePage />;
}
