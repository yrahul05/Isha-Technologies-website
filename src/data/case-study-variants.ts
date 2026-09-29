import type { BlogVariant } from './blog-variants';

/**
 * Maps each case study to a visual variant, reusing the exact same
 * `BlogVariant` palette blog posts use (see blog-variants.ts) — one design
 * system, applied consistently across both content types, rather than a
 * second bespoke color scheme. Keyed by slug (not `category`) because two
 * case studies share the category `'DevOps'` (`ci-cd-automation` and
 * `terraform-automation`) but are visually distinct topics — one reads as
 * a delivery pipeline, the other as infrastructure-as-code.
 */
const CASE_STUDY_SLUG_TO_VARIANT: Record<string, BlogVariant> = {
  'ci-cd-automation': 'devops',
  'cloud-infrastructure': 'cloud',
  'kubernetes-platform': 'kubernetes',
  'terraform-automation': 'terraform',
  'cloud-migration': 'cloud',
  'cloud-cost-optimization': 'cost-optimization',
  devsecops: 'security',
  observability: 'observability',
  'site-reliability': 'reliability',
};

export function getCaseStudyVariant(slug: string): BlogVariant {
  return CASE_STUDY_SLUG_TO_VARIANT[slug] ?? 'general';
}
