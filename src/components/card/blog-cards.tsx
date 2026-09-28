'use client';

import { blogCategories } from '@/data/blog-categories';
import { blogCategoryIcons } from '@/data/blog-category-icons';
import { formatBlogDate } from '@/data/blog-posts';
import { BLOG_VARIANT_STYLES, getBlogVariant } from '@/data/blog-variants';
import type { BlogPostSummary } from '@/types/blog';
import { ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export function BlogCard({ post }: { post: BlogPostSummary }) {
  const Icon = blogCategoryIcons[post.category as keyof typeof blogCategoryIcons];
  const variant = BLOG_VARIANT_STYLES[getBlogVariant(post.category)];

  return (
    <Link
      href={`/resources/blogs/${post.slug}`}
      className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-300 ease-out group-hover:scale-110 ${variant.soft} ${variant.text}`}
        >
          {Icon && <Icon className="h-4 w-4" strokeWidth={1.8} />}
        </span>
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${variant.text}`}>
          {post.category}
        </span>
      </div>

      <h3 className="text-base font-bold leading-snug tracking-tight text-black">
        {post.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">{post.excerpt}</p>

      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readingTime}
          </span>
          <span>{formatBlogDate(post.publishedAt)}</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${variant.text}`}>
          Read Article
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function BlogGrid({ posts }: { posts: BlogPostSummary[] }) {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const usedCategories = useMemo(
    () => blogCategories.filter((category) => posts.some((post) => post.category === category)),
    [posts]
  );

  const filtered = useMemo(
    () =>
      activeCategory === 'All'
        ? posts
        : posts.filter((post) => post.category === activeCategory),
    [posts, activeCategory]
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {['All', ...usedCategories].map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
              activeCategory === category
                ? 'border-brand bg-brand text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-brand/40 hover:text-brand'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          More articles for this category are on the way.
        </p>
      )}
    </div>
  );
}
