import { BlogCard } from '@/components/card/blog-cards';
import type { BlogPostSummary } from '@/types/blog';

/** Related posts are selected upstream (src/data/blog-posts.ts
 * getRelatedPosts — same category first, then others, newest-first) —
 * never random. Renders nothing if there's nothing relevant to show. */
export function RelatedBlogs({ posts }: { posts: BlogPostSummary[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="mx-auto mt-16 max-w-5xl">
      <h2 className="mb-1 text-xl font-bold tracking-tight text-black">Related Articles</h2>
      <p className="mb-6 text-sm text-gray-500">More on this and related topics.</p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
