import { ServiceHeroVisual } from '@/components/services/visuals/ServiceHeroVisual';
import { Badge } from '@/components/ui/badge';
import { blogCategoryIcons } from '@/data/blog-category-icons';
import { formatBlogDate } from '@/data/blog-posts';
import type { BLOG_VARIANT_STYLES } from '@/data/blog-variants';
import type { BlogPost } from '@/types/blog';
import { Clock, User } from 'lucide-react';

type VariantStyle = (typeof BLOG_VARIANT_STYLES)[keyof typeof BLOG_VARIANT_STYLES];

export function BlogHero({ post, variant }: { post: BlogPost; variant: VariantStyle }) {
  const CategoryIcon = blogCategoryIcons[post.category as keyof typeof blogCategoryIcons];
  const hasBeenUpdated = post.updatedAt !== post.publishedAt;

  return (
    <div className="relative overflow-hidden">
      {/* Soft variant-tinted backdrop — CSS gradient only, no image asset */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b ${variant.gradientFrom} ${variant.gradientTo}`}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-3xl pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${variant.border} ${variant.soft} ${variant.text}`}>
            {CategoryIcon && <CategoryIcon className="h-3.5 w-3.5" />}
            {post.category}
          </Badge>
          {post.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-gray-500">
              {tag}
            </Badge>
          ))}
        </div>

        <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tighter text-black md:text-[2.75rem]">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-600">{post.introduction}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-gray-100 py-4 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" />
            {post.author}
          </span>
          <span>Published {formatBlogDate(post.publishedAt)}</span>
          {hasBeenUpdated && <span>Updated {formatBlogDate(post.updatedAt)}</span>}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {post.readingTime}
          </span>
        </div>
      </div>

      <div
        className={`mx-auto mt-8 max-w-3xl rounded-2xl border ${variant.border} ${variant.soft} py-8`}
      >
        <ServiceHeroVisual slug={post.visualSlug} />
      </div>
    </div>
  );
}
