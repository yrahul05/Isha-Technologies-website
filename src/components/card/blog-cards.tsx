'use client';

import { blogCategories } from '@/data/blog-categories';
import { blogCategoryIcons } from '@/data/blog-category-icons';
import type { BlogPost } from '@/types/blog';
import { ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export function BlogCard({ post }: { post: BlogPost }) {
  const Icon = blogCategoryIcons[post.category as keyof typeof blogCategoryIcons];
  return (
    <Link
      href={`/resources/blogs/${post.slug}`}
      className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="card-accent-bg card-accent flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand transition-transform duration-300 ease-out group-hover:scale-110">
          {Icon && <Icon className="h-4 w-4" strokeWidth={1.8} />}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand">
          {post.category}
        </span>
      </div>

      <h3 className="text-base font-bold leading-snug tracking-tight text-black">
        {post.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">{post.excerpt}</p>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readingTime}
          </span>
          <span>{post.publishedLabel}</span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
          Read Article
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function BlogGrid({ posts }: { posts: BlogPost[] }) {
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
