import { BlogArticleLayout } from '@/components/blog/BlogArticleLayout';
import {
  buildBlogPostMetadata,
  getBlogPostBySlug,
  getPublishedBlogPosts,
  getRelatedPosts,
  toBlogPostSummary,
} from '@/data/blog-posts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// Draft posts never get a static page generated for them, so a draft slug
// 404s at build time — not just excluded from the listing.
export function generateStaticParams() {
  return getPublishedBlogPosts().map((post) => ({ slug: post.slug }));
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

  const related = getRelatedPosts(post, 3).map(toBlogPostSummary);

  const canonicalUrl = `https://www.ishatechnologies.in/resources/blogs/${post.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription ?? post.excerpt,
    image: `${canonicalUrl}/opengraph-image`,
    url: canonicalUrl,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords].join(', '),
    articleSection: post.category,
    author: {
      '@type': 'Organization',
      name: 'Isha Technologies',
      url: 'https://www.ishatechnologies.in',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Isha Technologies',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.ishatechnologies.in/ISHA-TECHNO-LG.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogArticleLayout post={post} related={related} />
    </>
  );
}
