import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, OgImageCard } from '@/lib/og-image';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Isha Technologies — Managed Cloud & DevOps Solutions';
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

/**
 * Default Open Graph / Twitter image for the whole site — Next.js applies
 * this to every page that doesn't define its own opengraph-image (services
 * and case studies have their own; blog posts have their own). Fixes what
 * every page previously pointed at: a hardcoded /og-image.png that was
 * never actually added to public/, so every social share was a broken image.
 */
export default async function Image() {
  return new ImageResponse(
    <OgImageCard eyebrow="Managed Cloud & DevOps" title="Isha Technologies" />,
    { ...size }
  );
}
