import { ChevronDown } from 'lucide-react';

export type Faq = { question: string; answer: string };

/**
 * One FAQ row as a native <details>/<summary> disclosure. Every answer is
 * always present in the server-rendered HTML (collapsed rows are only
 * visually closed), so the visible Q&A always matches the FAQPage
 * structured data. Keyboard and screen-reader support come from the
 * browser; no client JavaScript is needed.
 */
function FAQItem({ faq, defaultOpen }: { faq: Faq; defaultOpen: boolean }) {
  return (
    <details
      className="group border-b border-gray-100 last:border-b-0"
      open={defaultOpen}
    >
      <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold text-black [&::-webkit-details-marker]:hidden">
        <h3 className="text-[15px] font-semibold">{faq.question}</h3>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <p className="pb-4 text-sm leading-relaxed text-gray-600">{faq.answer}</p>
    </details>
  );
}

/** Accordion for a post's or service's FAQ entries — first one open by
 * default so the section doesn't look empty, the rest collapsed to keep the
 * page scannable. Renders nothing if there are no FAQs; never
 * force-populated with generic content. */
export function FAQSection({
  faqs,
  id = 'faq',
}: {
  faqs?: Faq[];
  id?: string;
}) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <div
      id={id}
      className="mx-auto mt-10 max-w-3xl scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-6"
    >
      <h2 className="text-lg font-bold tracking-tight text-black">
        Frequently Asked Questions
      </h2>
      <div className="mt-2">
        {faqs.map((faq, index) => (
          <FAQItem key={faq.question} faq={faq} defaultOpen={index === 0} />
        ))}
      </div>
    </div>
  );
}
