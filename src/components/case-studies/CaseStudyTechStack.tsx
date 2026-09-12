import type { CaseStudy } from '@/types/case-study';

export function CaseStudyTechStack({ study }: { study: CaseStudy }) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand">
          Technology Stack
        </span>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {study.technologies.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors duration-300 ease-out hover:border-brand hover:bg-brand/5 hover:text-brand"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
