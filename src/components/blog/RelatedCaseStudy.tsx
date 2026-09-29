import type { VariantStyle } from '@/data/blog-variants';
import { getRelatedCaseStudySlug } from '@/data/blog-case-study-links';
import { getCaseStudyBySlug } from '@/data/case-studies';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

/**
 * Cross-links a blog post to the one case study covering the same
 * technical scenario (see blog-case-study-links.ts) — renders nothing
 * when no genuinely relevant case study exists, rather than linking to
 * an unrelated one.
 */
export function RelatedCaseStudy({
  visualSlug,
  variant,
}: {
  visualSlug: string;
  variant: VariantStyle;
}) {
  const caseStudySlug = getRelatedCaseStudySlug(visualSlug);
  const study = caseStudySlug ? getCaseStudyBySlug(caseStudySlug) : undefined;
  if (!study) return null;

  return (
    <div className="not-prose mt-8">
      <Link
        href={`/case-studies/${study.slug}`}
        className={`group flex items-center justify-between gap-4 rounded-2xl border p-5 transition-all duration-300 ease-out hover:shadow-md ${variant.border} ${variant.soft}`}
      >
        <div>
          <span className={`text-[11px] font-bold uppercase tracking-widest ${variant.text}`}>
            Related Case Study
          </span>
          <h3 className="mt-1 text-base font-semibold text-black">{study.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">{study.summary}</p>
        </div>
        <ArrowUpRight
          className={`h-5 w-5 shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${variant.text}`}
        />
      </Link>
    </div>
  );
}
