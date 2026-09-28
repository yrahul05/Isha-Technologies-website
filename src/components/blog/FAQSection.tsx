'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export type Faq = { question: string; answer: string };

function FAQItem({ faq, defaultOpen }: { faq: Faq; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold text-black"
      >
        {faq.question}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-gray-600">{faq.answer}</p>}
    </div>
  );
}

/** Simple accordion for a post's FAQ entries — first one open by default so
 * the section doesn't look empty, the rest collapsed to keep the page
 * scannable. Renders nothing if a post has no FAQs; never force-populated
 * with generic content. */
export function FAQSection({ faqs, id = 'faq' }: { faqs?: Faq[]; id?: string }) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <div id={id} className="mx-auto mt-10 max-w-3xl scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-bold tracking-tight text-black">Frequently Asked Questions</h2>
      <div className="mt-2">
        {faqs.map((faq, index) => (
          <FAQItem key={faq.question} faq={faq} defaultOpen={index === 0} />
        ))}
      </div>
    </div>
  );
}
