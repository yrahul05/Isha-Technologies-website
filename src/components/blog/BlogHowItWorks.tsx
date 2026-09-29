import { ServiceHeroVisual } from '@/components/services/visuals/ServiceHeroVisual';
import type { VariantStyle } from '@/data/blog-variants';
import { HOW_IT_WORKS_COPY } from '@/data/how-it-works-copy';

/**
 * A prominent, topic-specific "How It Works" section for blog posts —
 * reuses the same per-topic animated diagram already built for service
 * page heroes (`ServiceHeroVisual`), but presents it as a featured,
 * explained section in the article body instead of a small hero
 * decoration. Renders nothing if the post's `visualSlug` has no matching
 * explanatory copy, rather than showing an unexplained diagram.
 */
export function BlogHowItWorks({
  visualSlug,
  variant,
}: {
  visualSlug: string;
  variant: VariantStyle;
}) {
  const copy = HOW_IT_WORKS_COPY[visualSlug];
  if (!copy) return null;

  return (
    <section className="not-prose my-12">
      <div className="max-w-2xl">
        <span className={`text-xs font-semibold uppercase tracking-wide ${variant.text}`}>
          {copy.eyebrow}
        </span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-black md:text-[1.75rem]">
          {copy.heading}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-gray-600">{copy.description}</p>
      </div>

      <div
        className={`mt-8 flex justify-center rounded-[28px] border ${variant.border} ${variant.soft} px-6 py-12 md:py-16`}
      >
        <ServiceHeroVisual slug={visualSlug} />
      </div>
    </section>
  );
}
