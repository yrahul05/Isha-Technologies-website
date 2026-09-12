import type { Service } from '@/types/types';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export function RelatedServices({ services }: { services: Service[] }) {
  if (!services.length) return null;

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand">
          Related Services
        </span>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className="group flex items-center justify-between rounded-[20px] border border-gray-200 bg-white p-5 transition-all duration-300 ease-out hover:border-brand hover:bg-brand/[0.04] hover:shadow-md"
            >
              <div>
                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-brand">
                  {service.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {service.description}
                </p>
              </div>
              <ArrowUpRight className="ml-3 h-4 w-4 shrink-0 text-gray-300 transition-colors duration-300 ease-out group-hover:text-brand" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
