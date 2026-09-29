/**
 * Maps a blog's existing `category` (src/data/blog-categories.ts) to a
 * visual variant, and each variant to a small accent-color/gradient
 * treatment. This is what gives different blog topics a distinct feel
 * (hero background tint, TOC active-state color, tag accents) while every
 * post still uses the exact same components and the same brand blue for
 * primary actions (buttons, links) — only the variant accent changes.
 *
 * Deliberately a small, curated set of variants (not one per category):
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
  | 'observability'
  | 'reliability'
  | 'platform'
  | 'ai'
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
  Observability: 'observability',
  'Site Reliability': 'reliability',
  'Platform Engineering': 'platform',
  'AI-Powered DevOps & AIOps': 'ai',
  'Linux & Infrastructure': 'general',
};

export function getBlogVariant(category: string): BlogVariant {
  return CATEGORY_TO_VARIANT[category] ?? 'general';
}

export type VariantStyle = {
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
  observability: {
    text: 'text-cyan-600',
    soft: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    gradientFrom: 'from-cyan-500/15',
    gradientTo: 'to-cyan-500/0',
  },
  reliability: {
    text: 'text-teal-600',
    soft: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    gradientFrom: 'from-teal-500/15',
    gradientTo: 'to-teal-500/0',
  },
  platform: {
    text: 'text-sky-600',
    soft: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    gradientFrom: 'from-sky-500/15',
    gradientTo: 'to-sky-500/0',
  },
  ai: {
    text: 'text-purple-600',
    soft: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    gradientFrom: 'from-purple-500/15',
    gradientTo: 'to-purple-500/0',
  },
  general: {
    text: 'text-brand',
    soft: 'bg-brand/10',
    border: 'border-brand/30',
    gradientFrom: 'from-brand/15',
    gradientTo: 'to-brand/0',
  },
};
