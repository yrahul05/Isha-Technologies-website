import type { CaseStudy } from '@/types/case-study';

export function CaseStudyApproach({ study }: { study: CaseStudy }) {
  return (
    <section className="bg-brand/[0.03] py-16">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 md:grid-cols-[minmax(0,280px)_1fr] md:gap-16">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            Our Approach
          </span>
        </div>
        <div className="space-y-4">
          {study.approach.map((paragraph, idx) => (
            <p key={idx} className="max-w-2xl text-base leading-relaxed text-slate-600">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
