import { ContactFinalCTA } from '@/components/contact/ContactFinalCTA';
import { ContactHero } from '@/components/contact/ContactHero';
import { ContactInfoPanel } from '@/components/contact/ContactInfoPanel';
import { ContactLocation } from '@/components/contact/ContactLocation';
import { ContactQuickCards } from '@/components/contact/ContactQuickCards';
import { ContactServicesArea } from '@/components/contact/ContactServicesArea';
import { ContactForm } from '@/components/forms/ContactForm';
import type { Metadata } from 'next';

const description =
  'Talk to Isha Technologies about cloud infrastructure, DevOps automation, Kubernetes, cloud migration, security, reliability and observability.';

export const metadata: Metadata = {
  title: 'Contact Isha Technologies | Cloud & DevOps Solutions',
  description,
  keywords:
    'Contact Isha Technologies, Cloud Infrastructure, DevOps Solutions, Kubernetes, Cloud Migration, Observability',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    type: 'website',
    url: '/contact',
    siteName: 'Isha Technologies',
    title: 'Contact Isha Technologies | Cloud & DevOps Solutions',
    description,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Contact Isha Technologies',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Isha Technologies | Cloud & DevOps Solutions',
    description,
    images: ['/og-image.png'],
  },
};

export default function Page() {
  return (
    <>
      <ContactHero />

      <section className="bg-brand/[0.03] py-14">
        <div className="mx-auto max-w-[1280px] px-4">
          <ContactServicesArea />

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-10">
            <ContactInfoPanel />
            <ContactForm />
          </div>
        </div>
      </section>

      <ContactQuickCards />
      <ContactLocation />
      <ContactFinalCTA />
    </>
  );
}
