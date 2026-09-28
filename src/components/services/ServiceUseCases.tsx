import { CheckCircle2 } from 'lucide-react';

export function ServiceUseCases({ useCases }: { useCases: string[] }) {
  if (!useCases.length) return null;

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-10 max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            Use Cases
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Where This Service Helps
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {useCases.map((useCase) => (
            <div
              key={useCase}
              className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4"
            >
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" strokeWidth={1.75} />
              <span className="text-sm leading-relaxed text-slate-700">{useCase}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
