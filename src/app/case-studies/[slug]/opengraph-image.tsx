import { getCaseStudyBySlug } from '@/data/case-studies';
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, OgImageCard } from '@/lib/og-image';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Isha Technologies — Technical Scenario';
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);

  return new ImageResponse(
    (
      <OgImageCard
        eyebrow={study?.displayCategory ?? 'Technical Scenario'}
        title={study?.title ?? 'Isha Technologies'}
      />
    ),
    { ...size }
  );
}
