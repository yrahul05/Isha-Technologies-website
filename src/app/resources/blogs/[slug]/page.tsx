import { BlogCard } from '@/components/card/blog-cards';
import { ServiceHeroVisual } from '@/components/services/visuals/ServiceHeroVisual';
import { CTABanner } from '@/components/cta-banner';
import { HeroBanner } from '@/components/layout/HeroBanner';
import { MarkdownContainerNormal } from '@/components/markdown-container-normal';
import { Badge } from '@/components/ui/badge';
import {
  blogPosts,
  buildBlogPostMetadata,
  getBlogPostBySlug,
  getRelatedPosts,
} from '@/data/blog-posts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, User } from 'lucide-react';

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return {};
  return buildBlogPostMetadata(post);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: post.title,
    description: post.excerpt,
    articleSection: post.category,
    author: {
      '@type': 'Organization',
      name: 'Isha Technologies',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Isha Technologies',
      logo: {
        '@type': 'ImageObject',
        url: 'https://ishatechnologies.in/app-logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://ishatechnologies.in/resources/blogs/${post.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroBanner title="TECHNICAL RESOURCES" />
      <section className="py-12">
        <div className="max-w-[1280px] mx-auto px-4">
          <Link
            href="/resources/blogs"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" />
            All Technical Resources
          </Link>

          <div className="mx-auto max-w-3xl">
            <Badge>{post.category}</Badge>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tighter text-black md:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-lg text-gray-600">{post.introduction}</p>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-gray-100 py-4 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {post.author}
              </span>
              <span>{post.publishedLabel}</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readingTime}
              </span>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-gray-200 bg-brand/5 py-8">
            <ServiceHeroVisual slug={post.visualSlug} />
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
            {/* Table of contents */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                In This Article
              </p>
              <nav className="flex flex-col gap-2 border-l-2 border-gray-100 pl-3">
                {post.toc.map((entry) => (
                  <a
                    key={entry.id}
                    href={`#${entry.id}`}
                    className="text-sm text-gray-600 transition hover:text-brand"
                  >
                    {entry.heading}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Article body */}
            <div>
              <MarkdownContainerNormal
                content={post.contentHtml}
                className="!mx-0 !max-w-none !p-0"
              />

              {/* Key takeaways */}
              <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-bold tracking-tight text-black">
                  Key Takeaways
                </h2>
                <ul className="mt-4 space-y-3">
                  {post.keyTakeaways.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-3xl">
            <CTABanner
              eyebrow={post.category}
              title="Ready to put this into practice?"
              description={post.excerpt}
              ctaText={post.ctaLabel}
              ctaHref={post.ctaHref}
            />
          </div>

          {/* Related articles */}
          {related.length > 0 && (
            <div className="mx-auto mt-12 max-w-5xl">
              <h2 className="mb-5 text-xl font-bold tracking-tight text-black">
                Related Articles
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((relatedPost) => (
                  <BlogCard key={relatedPost.slug} post={relatedPost} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
