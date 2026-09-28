import { CaseStudyDetailTemplate } from '@/components/case-studies/CaseStudyDetailTemplate';
import { buildCaseStudyMetadata, caseStudies, getCaseStudyBySlug } from '@/data/case-studies';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) return {};
  return buildCaseStudyMetadata(study);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) notFound();

  const canonicalUrl = `https://www.ishatechnologies.in/case-studies/${study.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: study.title,
    description: study.seo.description,
    url: canonicalUrl,
    articleSection: study.displayCategory,
    about: 'Representative engineering scenario — not a verified client engagement.',
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
      <CaseStudyDetailTemplate study={study} />
    </>
  );
}
