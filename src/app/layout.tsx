import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import Script from 'next/script';
import { JsonLd } from '@/components/JsonLd';
import { CONTACT_EMAIL_ADDRESS } from '@/data/contact';
import {
  LOGO_URL,
  ORGANIZATION_ID,
  SITE_NAME,
  SITE_URL,
  WEBSITE_ID,
} from '@/lib/seo';

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

// Official Isha Technologies organization profiles only — the same set
// linked from the footer (src/data/data.js). Deliberately excludes the
// individual team-member LinkedIn profiles and the Upwork link (a personal
// freelancer profile, not this organization's own page) and Medium (could
// not be independently verified — its host blocks automated checks).
const ORGANIZATION_SAME_AS = [
  'https://www.linkedin.com/company/isha-technologies-official',
  'https://www.instagram.com/isha_technologies_official/',
  'https://github.com/IshaTechnologies',
];

const description =
  'Isha Technologies is a cloud and DevOps engineering company in Jaipur, India — cloud architecture, Kubernetes, CI/CD, Terraform, security and cloud operations.';

const TITLE = 'Isha Technologies | Cloud & DevOps Infrastructure Engineering';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  publisher: SITE_NAME,
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_IN',
    title: TITLE,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description,
  },
};

/**
 * Site-wide entity graph. Organization (not LocalBusiness /
 * ProfessionalService): there is no public street address, opening hours
 * or service-area data to publish, and those types expect them — so only
 * verified facts are used here (city/region/country, contact details,
 * founding year, official profiles). No ratings, reviews, price range or
 * partner-program claims.
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: LOGO_URL, width: 2172, height: 724 },
      description,
      slogan: 'The Engineering Behind What’s Next.',
      foundingDate: '2026',
      email: CONTACT_EMAIL_ADDRESS,
      telephone: '+91-9351267228',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Jaipur',
        addressRegion: 'Rajasthan',
        addressCountry: 'IN',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: CONTACT_EMAIL_ADDRESS,
        telephone: '+91-9351267228',
        url: `${SITE_URL}/contact`,
      },
      knowsAbout: [
        'Cloud infrastructure',
        'DevOps',
        'Kubernetes',
        'Infrastructure as Code',
        'Terraform',
        'CI/CD',
        'DevSecOps',
        'Cloud security',
        'Observability',
        'Site reliability engineering',
        'Cloud cost optimization',
        'Cloud migration',
      ],
      sameAs: ORGANIZATION_SAME_AS,
    },
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: SITE_URL,
      name: SITE_NAME,
      description,
      inLanguage: 'en',
      publisher: { '@id': ORGANIZATION_ID },
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
        <JsonLd data={jsonLd} />
        <Navbar />
        {children}
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
