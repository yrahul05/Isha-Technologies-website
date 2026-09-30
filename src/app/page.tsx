import { HomePage } from '@/components/homepage';
import { buildMetadata } from '@/lib/seo';

import { Metadata } from 'next';

export const metadata: Metadata = buildMetadata({
  title: 'Isha Technologies | Cloud & DevOps Infrastructure Engineering',
  description:
    'Isha Technologies is a cloud and DevOps engineering company in Jaipur, India — cloud architecture, Kubernetes, CI/CD, Terraform, security and cloud operations.',
  path: '/',
});

export default function page() {
  return <HomePage />;
}
