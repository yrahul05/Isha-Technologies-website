import type { CaseStudy } from '@/types/case-study';
import { CheckCircle2 } from 'lucide-react';

export function CaseStudyImplementation({ study }: { study: CaseStudy }) {
  return (
    <section className="bg-brand/[0.03] py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-10 max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            Implementation
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Engineering Focus Areas
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {study.focusAreas.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
