import { CaseStudyDetailTemplate } from '@/components/case-studies/CaseStudyDetailTemplate';
import { buildCaseStudyMetadata, caseStudies, getCaseStudyBySlug } from '@/data/case-studies';
import { JsonLd } from '@/components/JsonLd';
import { LOGO_URL, WEBSITE_ID, absoluteUrl, organizationReference } from '@/lib/seo';
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

  const canonicalUrl = absoluteUrl(`/case-studies/${study.slug}`);

  // TechArticle, deliberately not a client case study / Review: these are
  // representative engineering scenarios with no client, dates or results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${canonicalUrl}#article`,
    headline: study.title,
    description: study.seo.description,
    disambiguatingDescription:
      'Representative engineering scenario (reference architecture) — not a verified client engagement.',
    image: `${canonicalUrl}/opengraph-image`,
    url: canonicalUrl,
    inLanguage: 'en',
    articleSection: study.displayCategory,
    keywords: study.technologies,
    author: organizationReference,
    publisher: { ...organizationReference, logo: { '@type': 'ImageObject', url: LOGO_URL } },
    isPartOf: { '@id': WEBSITE_ID },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <CaseStudyDetailTemplate study={study} />
    </>
  );
}
