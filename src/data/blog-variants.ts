/**
 * Maps a blog's existing `category` (src/data/blog-categories.ts) to a
 * visual variant, and each variant to a small accent-color/gradient
 * treatment. This is what gives different blog topics a distinct feel
 * (hero background tint, TOC active-state color, tag accents) while every
 * post still uses the exact same components and the same brand blue for
 * primary actions (buttons, links) — only the variant accent changes.
 *
 * Deliberately a small, curated set of 7 variants (not one per category):
 * several categories share a treatment (e.g. AWS/Cloud Migration/Azure/
 * Google Cloud all read as "cloud"), which keeps the system reusable
 * instead of needing a bespoke design per category.
 */
export type BlogVariant =
  | 'cloud'
  | 'kubernetes'
  | 'devops'
  | 'security'
  | 'terraform'
  | 'cost-optimization'
  | 'general';

const CATEGORY_TO_VARIANT: Record<string, BlogVariant> = {
  AWS: 'cloud',
  'Cloud Infrastructure': 'cloud',
  'Cloud Migration': 'cloud',
  'Microsoft Azure': 'cloud',
  'Google Cloud': 'cloud',
  Kubernetes: 'kubernetes',
  DevOps: 'devops',
  'CI/CD': 'devops',
  DevSecOps: 'security',
  'Cloud Security': 'security',
  'Terraform & IaC': 'terraform',
  'Cloud Cost Optimization': 'cost-optimization',
  Observability: 'general',
  'Site Reliability': 'general',
  'Platform Engineering': 'general',
  'Linux & Infrastructure': 'general',
};

export function getBlogVariant(category: string): BlogVariant {
  return CATEGORY_TO_VARIANT[category] ?? 'general';
}

type VariantStyle = {
  /** Tailwind text-color utility for accents (active TOC link, icon). */
  text: string;
  /** Tailwind background utility for soft chips/badges. */
  soft: string;
  /** Tailwind border utility matching the accent. */
  border: string;
  /** Two-stop gradient (from/via/to-free — just from/to) for hero backdrops. */
  gradientFrom: string;
  gradientTo: string;
};

export const BLOG_VARIANT_STYLES: Record<BlogVariant, VariantStyle> = {
  cloud: {
    text: 'text-brand',
    soft: 'bg-brand/10',
    border: 'border-brand/30',
    gradientFrom: 'from-brand/15',
    gradientTo: 'to-brand/0',
  },
  kubernetes: {
    text: 'text-indigo-600',
    soft: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    gradientFrom: 'from-indigo-500/15',
    gradientTo: 'to-indigo-500/0',
  },
  devops: {
    text: 'text-amber-600',
    soft: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    gradientFrom: 'from-amber-500/15',
    gradientTo: 'to-amber-500/0',
  },
  security: {
    text: 'text-rose-600',
    soft: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    gradientFrom: 'from-rose-500/15',
    gradientTo: 'to-rose-500/0',
  },
  terraform: {
    text: 'text-violet-600',
    soft: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    gradientFrom: 'from-violet-500/15',
    gradientTo: 'to-violet-500/0',
  },
  'cost-optimization': {
    text: 'text-emerald-600',
    soft: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    gradientFrom: 'from-emerald-500/15',
    gradientTo: 'to-emerald-500/0',
  },
  general: {
    text: 'text-brand',
    soft: 'bg-brand/10',
    border: 'border-brand/30',
    gradientFrom: 'from-brand/15',
    gradientTo: 'to-brand/0',
  },
};
