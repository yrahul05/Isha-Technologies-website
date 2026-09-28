import type { ReactElement } from 'react';

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const OG_IMAGE_CONTENT_TYPE = 'image/png';

const BRAND = '#3478e4';

/**
 * Shared branded card layout for every generated Open Graph / Twitter
 * image on the site (root, service pages, case studies, blog posts) — one
 * visual language, no stock imagery, and no static image asset to keep in
 * sync with page content. Consumed by each route's own opengraph-image.tsx
 * via `new ImageResponse(<OgImageCard .../>, OG_IMAGE_SIZE)` — Next.js
 * requires the ImageResponse itself to be constructed in each route file,
 * but the visual design lives here once.
 */
export function OgImageCard({ eyebrow, title }: { eyebrow: string; title: string }): ReactElement {
  return (
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
          {eyebrow}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#0a0a0a' }}>
          Isha Technologies
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: '#6b7280' }}>ishatechnologies.in</div>
      </div>
    </div>
  );
}
