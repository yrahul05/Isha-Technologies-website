import type { ServiceValuePoint } from '@/types/types';
import { CheckCircle2 } from 'lucide-react';

export function BusinessValue({ points }: { points: ServiceValuePoint[] }) {
  return (
    <section className="bg-brand/[0.03] py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-10 max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            Why It Matters
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Operational Value
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((point) => (
            <div
              key={point.title}
              className="group rounded-[20px] border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:border-brand hover:bg-brand/[0.04] hover:shadow-md"
            >
              <CheckCircle2 className="h-5 w-5 text-brand" strokeWidth={1.75} />
              <h3 className="mt-3 text-base font-semibold tracking-tight text-slate-900 transition-colors duration-300 ease-out group-hover:text-brand">
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
