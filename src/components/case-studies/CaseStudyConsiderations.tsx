import type { VariantStyle } from '@/data/blog-variants';
import type { CaseStudy } from '@/types/case-study';
import { Lightbulb } from 'lucide-react';

export function CaseStudyConsiderations({
  study,
  variant,
}: {
  study: CaseStudy;
  variant: VariantStyle;
}) {
  return (
    <section className="bg-brand/[0.03] py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-8 max-w-xl">
          <span className={`text-xs font-semibold uppercase tracking-wide ${variant.text}`}>
            Engineering Considerations
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            What Shapes This Kind of Work
          </h2>
        </div>

        <div className="space-y-3">
          {study.considerations.map((point, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4"
            >
              <Lightbulb className={`mt-0.5 h-4 w-4 shrink-0 ${variant.text}`} strokeWidth={1.75} />
              <p className="text-sm leading-relaxed text-slate-600">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
