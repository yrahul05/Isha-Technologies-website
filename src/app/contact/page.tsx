import { ContactFinalCTA } from '@/components/contact/ContactFinalCTA';
import { ContactHero } from '@/components/contact/ContactHero';
import { ContactInfoPanel } from '@/components/contact/ContactInfoPanel';
import { ContactLocation } from '@/components/contact/ContactLocation';
import { ContactServicesArea } from '@/components/contact/ContactServicesArea';
import { ContactForm } from '@/components/forms/ContactForm';
import { buildMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = buildMetadata({
  title: 'Contact Isha Technologies | Cloud & DevOps Solutions',
  description:
    'Talk to Isha Technologies in Jaipur, Rajasthan about cloud infrastructure, DevOps automation, Kubernetes, cloud migration, security, reliability and observability.',
  path: '/contact',
});

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

      <ContactLocation />
      <ContactFinalCTA />
    </>
  );
}
