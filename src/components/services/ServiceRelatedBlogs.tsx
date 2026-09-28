import { RelatedBlogs } from '@/components/blog/RelatedBlogs';
import type { BlogPostSummary } from '@/types/blog';

/** Section chrome around the shared blog RelatedBlogs grid — posts are
 * matched to this service by category/tags (see getRelatedPostsForService
 * in src/data/blog-posts.ts), never random or unrelated. */
export function ServiceRelatedBlogs({ posts }: { posts: BlogPostSummary[] }) {
  if (!posts.length) return null;

  return (
    <section className="bg-brand/[0.03] py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <RelatedBlogs posts={posts} />
      </div>
    </section>
  );
}
