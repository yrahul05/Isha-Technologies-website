import { CTABanner } from '@/components/cta-banner';
import type { BlogPost } from '@/types/blog';

/** A category-aware heading ("Need help with your Kubernetes
 * infrastructure?") over the site's existing CTABanner — not a new
 * component from scratch, since CTABanner is already the right visual
 * treatment (brand gradient, matches every other CTA on the site). */
export function BlogCTA({ post }: { post: BlogPost }) {
  return (
    <div className="mx-auto mt-14 max-w-3xl">
      <CTABanner
        eyebrow={post.category}
        title={`Need help with your ${post.category} infrastructure?`}
        description={post.excerpt}
        ctaText={post.ctaLabel}
        ctaHref={post.ctaHref}
      />
    </div>
  );
}
