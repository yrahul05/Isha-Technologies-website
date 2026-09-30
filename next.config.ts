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
  // Permanent redirects from the previous service URL structure to the
  // current canonical 14-service structure (see src/data/services.ts).
  // Kept indefinitely — these old URLs are still indexed and linked from
  // outside the site, so they must keep resolving, not 404.
  async redirects() {
    return [
      // Canonical host: the bare apex domain was serving a full duplicate of
      // the site (HTTP 200) instead of redirecting. Scoped to the apex host
      // only, so it can never loop with www — and it's harmless if a
      // Vercel domain-level redirect is added later (that runs first).
      // Preserves the path, e.g. ishatechnologies.in/about → www…/about.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'ishatechnologies.in' }],
        destination: 'https://www.ishatechnologies.in/:path*',
        permanent: true,
      },
      {
        source: '/services/cloud-migration',
        destination: '/services/cloud-migration-modernization',
        permanent: true,
      },
      {
        source: '/services/cloud-cost-optimization',
        destination: '/services/cloud-cost-optimization-finops',
        permanent: true,
      },
      {
        source: '/services/platform-solutions',
        destination: '/services/platform-engineering',
        permanent: true,
      },
      {
        source: '/services/kubernetes',
        destination: '/services/kubernetes-container-platforms',
        permanent: true,
      },
      {
        source: '/services/observability',
        destination: '/services/observability-monitoring',
        permanent: true,
      },
      {
        source: '/services/site-reliability',
        destination: '/services/site-reliability-engineering',
        permanent: true,
      },
      {
        source: '/services/terraform',
        destination: '/services/infrastructure-as-code-gitops',
        permanent: true,
      },
      {
        source: '/services/aws',
        destination: '/services/cloud-solutions',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
