import { getBlogPostBySlug } from '@/data/blog-posts';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Isha Technologies — Technical Resource';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BRAND = '#3478e4';

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
  const title = post?.title ?? 'Isha Technologies';
  const category = post?.category ?? 'Technical Resources';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 64,
            height: 6,
            backgroundColor: BRAND,
            borderRadius: 999,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 980 }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              color: BRAND,
              backgroundColor: '#eaf1fd',
              borderRadius: 999,
              padding: '10px 24px',
              fontSize: 26,
              fontWeight: 600,
              marginBottom: 32,
            }}
          >
            {category}
          </div>
          <div
            style={{
              display: 'flex',
              color: '#0a0a0a',
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#0a0a0a' }}>
            Isha Technologies
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: '#6b7280' }}>
            ishatechnologies.in
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
