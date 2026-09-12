import { ServiceHeroVisual } from '@/components/services/visuals/ServiceHeroVisual';
import { Button } from '@/components/ui/button';
import type { BlogPost } from '@/types/blog';
import { Clock } from 'lucide-react';
import Link from 'next/link';

export function FeaturedBlog({ post }: { post: BlogPost }) {
  return (
    <div className="card-hover mb-12 grid grid-cols-1 items-center gap-8 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-2 md:p-10">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-brand">
          Technical Guide
        </span>
        <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-black md:text-3xl">
          {post.title}
        </h2>
        <p className="mt-3 text-gray-600">
          A practical guide to architecture, security, automation, reliability
          and operational readiness.
        </p>
        <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readingTime}
          </span>
          <span>{post.publishedLabel}</span>
        </div>
        <Button asChild variant="primary" className="mt-6 h-11 rounded-lg px-5">
          <Link href={`/resources/blogs/${post.slug}`}>Read Technical Guide</Link>
        </Button>
      </div>
      <div className="rounded-xl bg-brand/5 py-6">
        <ServiceHeroVisual slug={post.visualSlug} />
      </div>
    </div>
  );
}
