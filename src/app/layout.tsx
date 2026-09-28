import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

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
