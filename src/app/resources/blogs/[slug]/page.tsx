import { BlogArticleLayout } from '@/components/blog/BlogArticleLayout';
import {
  buildBlogPostMetadata,
  getBlogPostBySlug,
  getPublishedBlogPosts,
  getRelatedPosts,
  toBlogPostSummary,
} from '@/data/blog-posts';
import { JsonLd } from '@/components/JsonLd';
import { authorJsonLd, getAuthor } from '@/data/authors';
import {
  LOGO_URL,
  WEBSITE_ID,
  absoluteUrl,
  organizationReference,
} from '@/lib/seo';
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

  const canonicalUrl = absoluteUrl(`/resources/blogs/${post.slug}`);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonicalUrl}#article`,
    headline: post.title,
    description: post.metaDescription ?? post.excerpt,
    image: {
      '@type': 'ImageObject',
      url: `${canonicalUrl}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    url: canonicalUrl,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: 'en',
    articleSection: post.category,
    keywords: post.tags,
    timeRequired: readingTimeToIsoDuration(post.readingTime),
    author: authorJsonLd(getAuthor(post.authorId)),
    publisher: {
      ...organizationReference,
      logo: { '@type': 'ImageObject', url: LOGO_URL },
    },
    isPartOf: { '@id': WEBSITE_ID },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  };

  // FAQPage only when the post has FAQs, which FAQSection renders visibly
  // in the server HTML — the schema always mirrors on-page content exactly.
  const faqJsonLd = post.faqs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      }
    : null;

  return (
    <>
      <JsonLd data={jsonLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <BlogArticleLayout post={post} related={related} />
    </>
  );
}

/** "11 min read" → "PT11M" (schema.org timeRequired); undefined if unparseable. */
function readingTimeToIsoDuration(readingTime: string): string | undefined {
  const minutes = Number.parseInt(readingTime, 10);
  return Number.isFinite(minutes) && minutes > 0 ? `PT${minutes}M` : undefined;
}
