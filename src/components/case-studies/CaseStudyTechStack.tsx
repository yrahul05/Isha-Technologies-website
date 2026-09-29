import type { VariantStyle } from '@/data/blog-variants';
import type { CaseStudy } from '@/types/case-study';

export function CaseStudyTechStack({
  study,
  variant,
}: {
  study: CaseStudy;
  variant: VariantStyle;
}) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <span className={`text-xs font-semibold uppercase tracking-wide ${variant.text}`}>
          Technology Stack
        </span>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {study.technologies.map((tech) => (
            <span
              key={tech}
              className={`rounded-full border ${variant.border} ${variant.soft} px-4 py-2 text-sm font-medium ${variant.text} transition-transform duration-300 ease-out hover:scale-[1.03]`}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
