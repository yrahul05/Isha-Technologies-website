'use client';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ArchitectureVisual } from '@/components/services/ArchitectureVisual';
import { ServiceCTA } from '@/components/services/ServiceCTA';
import { getAdjacentCaseStudies } from '@/data/case-studies';
import { getServiceBySlug } from '@/data/services';
import type { CaseStudy } from '@/types/case-study';
import { MotionConfig } from 'framer-motion';
import { CaseStudyApproach } from './CaseStudyApproach';
import { CaseStudyBenefits } from './CaseStudyBenefits';
import { CaseStudyConsiderations } from './CaseStudyConsiderations';
import { CaseStudyDetailHero } from './CaseStudyDetailHero';
import { CaseStudyImplementation } from './CaseStudyImplementation';
import { CaseStudyNavigation } from './CaseStudyNavigation';
import { CaseStudyProblem } from './CaseStudyProblem';
import { CaseStudyServiceCTA } from './CaseStudyServiceCTA';
import { CaseStudyTechStack } from './CaseStudyTechStack';

/**
 * Renders a complete case study detail page from one `CaseStudy` record.
 * Every one of the 9 case study routes renders through this same template —
 * mirrors `ServicePageTemplate`'s structure so the two content types stay
 * visually consistent across the site.
 */
export function CaseStudyDetailTemplate({ study }: { study: CaseStudy }) {
  const { previous, next } = getAdjacentCaseStudies(study);
  const relatedServiceTitle = getServiceBySlug(study.relatedService)?.title ?? 'Cloud Solutions';

  return (
    <MotionConfig reducedMotion="user">
      <div className="max-w-[1280px] mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Case Studies', href: '/case-studies' },
            { label: study.title, href: `/case-studies/${study.slug}` },
          ]}
        />
      </div>
      <CaseStudyDetailHero study={study} />
      <CaseStudyProblem study={study} />
      <CaseStudyApproach study={study} />
      <ArchitectureVisual nodes={study.flow} eyebrow="Solution" heading="Architecture & Solution Flow" />
      <CaseStudyImplementation study={study} />
      <CaseStudyTechStack study={study} />
      <CaseStudyConsiderations study={study} />
      <CaseStudyBenefits study={study} />
      <CaseStudyServiceCTA study={study} />
      <CaseStudyNavigation previous={previous} next={next} />
      <ServiceCTA
        heading="Facing an Infrastructure Challenge Like This?"
        serviceTitle={relatedServiceTitle}
      />
    </MotionConfig>
  );
}
