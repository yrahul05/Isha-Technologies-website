import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import Script from 'next/script';

// Read directly here (not imported from GoogleAnalytics.tsx) because that
// file is a 'use client' module — a plain value exported across a client
// boundary becomes a server-reference proxy that throws when read directly
// in a Server Component like this layout, instead of the real string.
// `NEXT_PUBLIC_` env vars are statically inlined at build time, so reading
// it here directly is safe and correct in both server and client contexts.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const DM_SansFonts = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const SITE_URL = 'https://www.ishatechnologies.in';

// Official Isha Technologies organization profiles only (not the individual
// team-member LinkedIn profiles, and not the Upwork link — that's a
// personal freelancer profile, not this organization's own page). Matches
// exactly what's already linked from the footer (src/data/data.js).
const ORGANIZATION_SAME_AS = [
  'https://www.linkedin.com/company/isha-technologies-official',
  'https://www.instagram.com/isha_technologies_official/',
  'https://github.com/IshaTechnologies',
];

const description =
  'Managed Cloud & DevOps Solutions from Isha Technologies — expert infrastructure support without building everything in-house. Cloud architecture, DevOps automation, Kubernetes, security, migration and observability.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Isha Technologies | Managed Cloud & DevOps Solutions',
  description,
  robots: 'index, follow',
  authors: [
    {
      name: 'Isha Technologies',
      url: SITE_URL,
    },
  ],
  publisher: 'Isha Technologies',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Isha Technologies',
    title: 'Isha Technologies | Managed Cloud & DevOps Solutions',
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Isha Technologies | Managed Cloud & DevOps Solutions',
    description,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Isha Technologies',
      url: SITE_URL,
      logo: `${SITE_URL}/ISHA-TECHNO-LG.png`,
      description,
      slogan: 'Managed Cloud & DevOps Solutions',
      email: 'hello.ishatechnologies@gmail.com',
      telephone: '+91-9351267228',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Jaipur',
        addressRegion: 'Rajasthan',
        addressCountry: 'IN',
      },
      sameAs: ORGANIZATION_SAME_AS,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Isha Technologies',
      description,
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${DM_SansFonts.variable} antialiased`}>
        {/*
          The gtag.js script tags MUST be declared directly inside this
          root layout file — `next/script`'s `beforeInteractive` strategy
          (which puts them in the raw server-rendered HTML, not only
          injected client-side after hydration) is only supported there,
          per Next.js's own App Router guidance. `afterInteractive` is
          Next.js's normal recommendation and does work for real visitors,
          but it left the tag genuinely absent from the raw HTML response
          — which is what Google's own automated "tag not detected"
          checker (and any tool that fetches HTML without running JS)
          flags. This is still the only place GA4 is ever loaded from —
          `<GoogleAnalytics />` below only handles the page-view effect
          for client-side route changes; see that file for the full
          explanation.
        */}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="beforeInteractive"
            />
            <Script id="ga4-init" strategy="beforeInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
              `}
            </Script>
          </>
        )}
        <GoogleAnalytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Navbar />
        {children}
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
