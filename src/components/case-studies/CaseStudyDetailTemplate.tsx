import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ArchitectureVisual } from '@/components/services/ArchitectureVisual';
import { ServiceCTA } from '@/components/services/ServiceCTA';
import { BLOG_VARIANT_STYLES } from '@/data/blog-variants';
import { getAdjacentCaseStudies } from '@/data/case-studies';
import { getCaseStudyVariant } from '@/data/case-study-variants';
import { getServiceBySlug } from '@/data/services';
import type { CaseStudy } from '@/types/case-study';
import { MotionProvider } from '@/components/MotionProvider';
import { RelatedBlogs } from '@/components/blog/RelatedBlogs';
import { getRelatedVisualSlugForCaseStudy } from '@/data/blog-case-study-links';
import { getPublishedBlogPosts, toBlogPostSummary } from '@/data/blog-posts';
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
 * visually consistent across the site. `variant` (from case-study-variants,
 * reusing the same palette as blog posts) gives each case study its own
 * accent color instead of one flat brand blue everywhere.
 */
export function CaseStudyDetailTemplate({ study }: { study: CaseStudy }) {
  const { previous, next } = getAdjacentCaseStudies(study);
  const relatedServiceTitle = getServiceBySlug(study.relatedService)?.title ?? 'Cloud Solutions';
  const variant = BLOG_VARIANT_STYLES[getCaseStudyVariant(study.slug)];
  // Articles that explain the same technical topic in more depth — matched
  // through the explicit case-study ↔ topic map, never a random set.
  const topic = getRelatedVisualSlugForCaseStudy(study.slug);
  const relatedPosts = topic
    ? getPublishedBlogPosts()
        .filter((post) => post.visualSlug === topic)
        .slice(0, 3)
        .map(toBlogPostSummary)
    : [];

  return (
    <MotionProvider>
      <div className="max-w-[1280px] mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Case Studies', href: '/case-studies' },
            { label: study.title, href: `/case-studies/${study.slug}` },
          ]}
        />
      </div>
      <CaseStudyDetailHero study={study} variant={variant} />
      <CaseStudyProblem study={study} variant={variant} />
      <CaseStudyApproach study={study} variant={variant} />
      <ArchitectureVisual
        nodes={study.flow}
        eyebrow="Solution"
        heading="Architecture & Solution Flow"
        variant={variant}
      />
      <CaseStudyImplementation study={study} variant={variant} />
      <CaseStudyTechStack study={study} variant={variant} />
      <CaseStudyConsiderations study={study} variant={variant} />
      <CaseStudyBenefits study={study} variant={variant} />
      <CaseStudyServiceCTA study={study} variant={variant} />
      {relatedPosts.length > 0 && (
        <section className="bg-white pb-12">
          <div className="mx-auto max-w-[1280px] px-4">
            <RelatedBlogs posts={relatedPosts} />
          </div>
        </section>
      )}
      <CaseStudyNavigation previous={previous} next={next} />
      <ServiceCTA
        heading="Facing an Infrastructure Challenge Like This?"
        serviceTitle={relatedServiceTitle}
      />
    </MotionProvider>
  );
}
