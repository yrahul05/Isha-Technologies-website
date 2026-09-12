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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: study.title,
    description: study.seo.description,
    articleSection: study.displayCategory,
    about: 'Representative engineering scenario — not a verified client engagement.',
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
      '@id': `https://ishatechnologies.in/case-studies/${study.slug}`,
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
