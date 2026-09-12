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

const description =
  'Managed Cloud & DevOps Solutions from Isha Technologies — expert infrastructure support without building everything in-house. Cloud architecture, DevOps automation, Kubernetes, security, migration and observability.';

export const metadata: Metadata = {
  metadataBase: new URL('https://ishatechnologies.in'),
  title: 'Isha Technologies | Managed Cloud & DevOps Solutions',
  description,
  robots: 'index, follow',
  authors: [
    {
      name: 'Isha Technologies',
      url: 'https://ishatechnologies.in',
    },
  ],
  publisher: 'Isha Technologies',
  openGraph: {
    type: 'website',
    url: 'https://ishatechnologies.in',
    siteName: 'Isha Technologies',
    title: 'Isha Technologies | Managed Cloud & DevOps Solutions',
    description,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Isha Technologies — Managed Cloud & DevOps Solutions',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Isha Technologies | Managed Cloud & DevOps Solutions',
    description,
    images: ['/og-image.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://ishatechnologies.in/#organization',
      name: 'Isha Technologies',
      url: 'https://ishatechnologies.in',
      logo: 'https://ishatechnologies.in/ISHA-TECHNO-LG.png',
      description,
      slogan: 'Managed Cloud & DevOps Solutions',
      email: 'hello.ishatechnologies@gmail.com',
      telephone: '+91-9783959837',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Jaipur',
        addressRegion: 'Rajasthan',
        addressCountry: 'IN',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://ishatechnologies.in/#website',
      url: 'https://ishatechnologies.in',
      name: 'Isha Technologies',
      description,
      publisher: { '@id': 'https://ishatechnologies.in/#organization' },
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
