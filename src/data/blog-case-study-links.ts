/**
 * Cross-links a blog post's `visualSlug` (which now always matches a real
 * service slug — see the services restructure) to the one case study that
 * covers the same technical scenario, and vice versa. Deliberately a
 * small, explicit map rather than a fuzzy match: several services
 * (managed-cloud, platform-engineering, the two AI services, cloud-
 * security) have no matching case study among the current 9, and this
 * intentionally omits a link rather than forcing an imprecise one.
 */
const VISUAL_SLUG_TO_CASE_STUDY: Record<string, string> = {
  'cloud-solutions': 'cloud-infrastructure',
  'devops-solutions': 'ci-cd-automation',
  'kubernetes-container-platforms': 'kubernetes-platform',
  'infrastructure-as-code-gitops': 'terraform-automation',
  'cloud-migration-modernization': 'cloud-migration',
  'cloud-cost-optimization-finops': 'cloud-cost-optimization',
  devsecops: 'devsecops',
  'observability-monitoring': 'observability',
  'site-reliability-engineering': 'site-reliability',
};

export function getRelatedCaseStudySlug(visualSlug: string): string | null {
  return VISUAL_SLUG_TO_CASE_STUDY[visualSlug] ?? null;
}

const CASE_STUDY_TO_VISUAL_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(VISUAL_SLUG_TO_CASE_STUDY).map(([visualSlug, caseStudySlug]) => [
    caseStudySlug,
    visualSlug,
  ])
);

export function getRelatedVisualSlugForCaseStudy(caseStudySlug: string): string | null {
  return CASE_STUDY_TO_VISUAL_SLUG[caseStudySlug] ?? null;
}
