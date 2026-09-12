import type { CaseStudy } from '@/types/case-study';
import { CheckCircle2 } from 'lucide-react';

export function CaseStudyBenefits({ study }: { study: CaseStudy }) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-10 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            Expected Operational Benefits
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            What This Approach Is Designed to Deliver
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">{study.outcome}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {study.benefits.map((point) => (
            <div key={point.title} className="rounded-[20px] border border-gray-200 bg-white p-5">
              <CheckCircle2 className="h-5 w-5 text-brand" strokeWidth={1.75} />
              <h3 className="mt-3 text-base font-semibold tracking-tight text-slate-900">
                {point.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
