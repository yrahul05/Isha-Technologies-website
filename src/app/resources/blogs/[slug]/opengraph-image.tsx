import { getBlogPostBySlug } from '@/data/blog-posts';
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, OgImageCard } from '@/lib/og-image';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Isha Technologies — Technical Resource';
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

/**
 * Generates a unique, on-brand social share image per blog post from its
 * own title and category — this site deliberately doesn't use stock
 * photography anywhere (see ServiceHeroVisual), so a generated card is the
 * closest equivalent to a "featured image" without introducing one. Next.js
 * applies this automatically to og:image and (absent a separate
 * twitter-image file) the Twitter card for every page under this route
 * segment — no manual wiring needed in generateMetadata.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  return new ImageResponse(
    (
      <OgImageCard
        eyebrow={post?.category ?? 'Technical Resources'}
        title={post?.title ?? 'Isha Technologies'}
      />
    ),
    { ...size }
  );
}
