import { getServiceBySlug } from '@/data/services';
import type { CaseStudy } from '@/types/case-study';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export function CaseStudyServiceCTA({ study }: { study: CaseStudy }) {
  const service = getServiceBySlug(study.relatedService);
  if (!service) return null;

  return (
    <section className="bg-brand/[0.03] py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand">
          Related Isha Technologies Service
        </span>

        <Link
          href={`/services/${service.slug}`}
          className="group mt-5 flex items-center justify-between rounded-[20px] border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 ease-out hover:border-brand hover:bg-brand/[0.04] hover:shadow-md"
        >
          <div>
            <h3 className="text-base font-semibold text-slate-900 group-hover:text-brand">
              {service.title}
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
              {service.description}
            </p>
          </div>
          <ArrowUpRight className="ml-4 h-5 w-5 shrink-0 text-gray-300 transition-colors duration-300 ease-out group-hover:text-brand" />
        </Link>
      </div>
    </section>
  );
}
