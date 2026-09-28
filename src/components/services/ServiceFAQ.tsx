import { FAQSection, type Faq } from '@/components/blog/FAQSection';

/** Wraps the shared blog FAQ accordion with the service-page section
 * chrome (eyebrow + heading) and emits FAQPage structured data, matching
 * the visible Q&A exactly — no schema without visible content. */
export function ServiceFAQ({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <section className="bg-white py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">FAQ</span>
        </div>
        <div className="max-w-3xl">
          <FAQSection faqs={faqs} />
        </div>
      </div>
    </section>
  );
}
