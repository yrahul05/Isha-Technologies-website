import type { NextConfig } from 'next';

// Deployed on Cloudflare Pages via `@cloudflare/next-on-pages` (GitHub
// integration — Cloudflare runs `npm run pages:build` on every push).
// `output: 'export'` must stay OFF because it disables the Next.js server
// entirely, which would make the /api/analytics/visitors and /api/contact
// Route Handlers unable to run in production. Both already declare
// `runtime = 'edge'` and use only `fetch`/Web Crypto, so they run fine as
// Cloudflare Pages Functions once built through next-on-pages.
const nextConfig: NextConfig = {
  images: {
    // Cloudflare Pages does not run Vercel's built-in image optimizer, so
    // <Image> would otherwise fail to resize/serve images in production.
    // Every <Image> in the app points at a local file under public/, so
    // serving the originals unoptimized is a safe, zero-config fallback —
    // switch this to a Cloudflare Images loader later if optimization is
    // needed.
    unoptimized: true,
    // A small number of local brand-logo assets (e.g. the Microsoft Azure
    // partner mark) are SVGs, which Next.js's image handling refuses to
    // serve by default (returns 400) as an XSS precaution against
    // untrusted SVGs. These are trusted, project-owned static files under
    // public/, so allow SVGs using Next's documented safe pattern: no
    // inline scripts, sandboxed, served as a download rather than inline
    // if ever requested directly.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;