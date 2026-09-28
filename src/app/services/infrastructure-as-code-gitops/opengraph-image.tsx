import { getServiceBySlug } from '@/data/services';
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, OgImageCard } from '@/lib/og-image';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Isha Technologies — Infrastructure as Code & GitOps';
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

const service = getServiceBySlug('infrastructure-as-code-gitops')!;

export default async function Image() {
  return new ImageResponse(
    <OgImageCard eyebrow={service.eyebrow} title={service.title} />,
    { ...size }
  );
}
