import { getServiceBySlug } from '@/data/services';
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, OgImageCard } from '@/lib/og-image';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Isha Technologies — Platform Engineering';
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

const service = getServiceBySlug('platform-engineering')!;

export default async function Image() {
  return new ImageResponse(
    <OgImageCard eyebrow={service.eyebrow} title={service.title} />,
    { ...size }
  );
}
