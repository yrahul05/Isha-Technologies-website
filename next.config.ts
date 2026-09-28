import type { NextConfig } from 'next';

// Deployed to Vercel (standard Next.js runtime, zero-config detection).
// `output: 'export'` must stay OFF because it disables the Next.js server
// entirely, which would make the /api/analytics/visitors and /api/contact
// Route Handlers unable to run in production.
const nextConfig: NextConfig = {
  images: {
    // Vercel runs Next.js's built-in image optimizer natively, so <Image>
    // is resized/served through it with no extra configuration. Every
    // <Image> in the app points at a local file under public/.
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