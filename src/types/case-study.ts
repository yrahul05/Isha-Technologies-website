import type { IconName } from '@/data/icon-map';

/** One node in a case study's architecture / solution-flow diagram. */
export type CaseStudyFlowNode = {
  label: string;
  icon: IconName;
};

export type CaseStudyBenefit = {
  title: string;
  description: string;
};

/**
 * A representative engineering scenario, not a verified client engagement.
 * See CREDIBILITY note in `@/data/case-studies` — no client names, metrics,
 * dates or outcomes are ever stored on this type.
 */
export type CaseStudy = {
  /** Route segment — page lives at /case-studies/[slug]. */
  slug: string;
  /** Display index, e.g. "01". */
  number: string;
  /** Matches one entry in `caseStudyFilters` — drives the filter UI. */
  category: string;
  /** Human-readable category label shown on the card and detail hero. */
  displayCategory: string;
  title: string;
  /** Key into ServiceHeroVisual's visual map — reuses the site's existing
   * custom SVG/Framer Motion visual system instead of stock imagery. */
  visualSlug: string;
  /** 2-3 line problem summary shown on the compact card. */
  summary: string;
  cardProblem: string;
  cardApproach: string;
  cardSolution: string;
  /** Short introduction shown on the detail page hero. */
  intro: string;
  problem: string[];
  challenges: string[];
  approach: string[];
  /** Architecture / solution diagram, rendered through ArchitectureVisual. */
  flow: CaseStudyFlowNode[];
  focusAreas: string[];
  technologies: string[];
  considerations: string[];
  outcome: string;
  benefits: CaseStudyBenefit[];
  /** Slug into `@/data/services`. */
  relatedService: string;
  ctaLabel: string;
  seo: {
    title: string;
    description: string;
  };
};
