import type { VariantStyle } from '@/data/blog-variants';
import { HOW_IT_WORKS_COPY } from '@/data/how-it-works-copy';

/**
 * The explanatory "How It Works" text block for blog posts — heading +
 * description only. The topic diagram itself (`ServiceHeroVisual`) is
 * rendered once, in `BlogHero`, right below the article introduction;
 * this section deliberately does NOT render it a second time (it
 * originally did, producing an identical animation twice on every post —
 * see the fix that removed it). Renders nothing if the post's
 * `visualSlug` has no matching explanatory copy, rather than showing an
 * empty heading.
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
    </section>
  );
}
