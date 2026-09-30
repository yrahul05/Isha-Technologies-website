import { CaseStudiesFinalCTA } from '@/components/case-studies/CaseStudiesFinalCTA';
import { CaseStudiesHero } from '@/components/case-studies/CaseStudiesHero';
import { CaseStudiesIntro } from '@/components/case-studies/CaseStudiesIntro';
import { CaseStudyExplorer } from '@/components/case-studies/CaseStudyExplorer';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = buildMetadata({
  title: 'Technical Scenarios & Case Studies | Isha Technologies',
  description:
    'Representative engineering scenarios, not client case studies, showing how Isha Technologies approaches CI/CD, Kubernetes, Terraform, migration and security.',
  path: '/case-studies',
});

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
