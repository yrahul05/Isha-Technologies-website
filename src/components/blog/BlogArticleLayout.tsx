import { BLOG_VARIANT_STYLES, getBlogVariant } from '@/data/blog-variants';
import type { BlogPost, BlogPostSummary } from '@/types/blog';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { BlogContent } from './BlogContent';
import { BlogCTA } from './BlogCTA';
import { BlogHero } from './BlogHero';
import { FAQSection } from './FAQSection';
import { RelatedBlogs } from './RelatedBlogs';
import { TableOfContents } from './TableOfContents';

/**
 * The one template every blog post renders through — a post's visual
 * "variant" (src/data/blog-variants.ts) is derived automatically from its
 * existing `category`, so this single component is what makes the design
 * system apply to every current and future post without per-post work.
 */
export function BlogArticleLayout({
  post,
  related,
}: {
  post: BlogPost;
  related: BlogPostSummary[];
}) {
  const variant = BLOG_VARIANT_STYLES[getBlogVariant(post.category)];

  return (
    <section className="py-12">
      <div className="max-w-[1280px] mx-auto px-4">
        <Link
          href="/resources/blogs"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          All Technical Resources
        </Link>

        <BlogHero post={post} variant={variant} />

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
          <TableOfContents entries={post.toc} accentText={variant.text} />

          <div>
            <BlogContent html={post.contentHtml} variant={variant} />

            {/* Key takeaways */}
            <div className={`not-prose mt-10 rounded-2xl border ${variant.border} ${variant.soft} p-6`}>
              <h2 className="text-lg font-bold tracking-tight text-black">Key Takeaways</h2>
              <ul className="mt-4 space-y-3">
                {post.keyTakeaways.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${variant.text}`} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <FAQSection faqs={post.faqs} />
          </div>
        </div>

        <BlogCTA post={post} />
        <RelatedBlogs posts={related} />
      </div>
    </section>
  );
}
