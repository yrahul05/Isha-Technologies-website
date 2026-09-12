import { CaseStudiesFinalCTA } from '@/components/case-studies/CaseStudiesFinalCTA';
import { CaseStudiesHero } from '@/components/case-studies/CaseStudiesHero';
import { CaseStudiesIntro } from '@/components/case-studies/CaseStudiesIntro';
import { CaseStudyExplorer } from '@/components/case-studies/CaseStudyExplorer';
import type { Metadata } from 'next';

const description =
  'Representative engineering scenarios from Isha Technologies covering cloud infrastructure, DevOps automation, Kubernetes, Terraform, cloud migration, cost optimization, DevSecOps, observability and site reliability. Technical demonstrations, not fabricated client case studies.';

export const metadata: Metadata = {
  title: 'Case Studies | Isha Technologies',
  description,
  keywords:
    'Isha Technologies case studies, cloud infrastructure engineering, DevOps automation, Kubernetes platform engineering, Terraform automation, cloud migration, cloud cost optimization, DevSecOps, observability, site reliability',
  alternates: {
    canonical: '/case-studies',
  },
  openGraph: {
    type: 'website',
    url: '/case-studies',
    siteName: 'Isha Technologies',
    title: 'Case Studies | Isha Technologies',
    description,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Isha Technologies Case Studies',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Case Studies | Isha Technologies',
    description,
    images: ['/og-image.png'],
  },
};

export default function Page() {
  return (
    <>
      <CaseStudiesHero />
      <CaseStudiesIntro />

      <section className="bg-brand/[0.03] py-16">
        <div className="mx-auto max-w-[1280px] px-4">
          <CaseStudyExplorer />
        </div>
      </section>

      <CaseStudiesFinalCTA />
    </>
  );
}
