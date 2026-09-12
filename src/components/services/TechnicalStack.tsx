import { CORE_TECHNOLOGIES, TECHNOLOGY_CATEGORIES } from '@/data/technical-capabilities';

function Chip({ label, emphasis = false }: { label: string; emphasis?: boolean }) {
  return (
    <span
      className={
        emphasis
          ? 'rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors duration-300 ease-out hover:border-brand hover:bg-brand/5 hover:text-brand'
          : 'rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors duration-300 ease-out hover:border-brand hover:bg-brand/5 hover:text-brand'
      }
    >
      {label}
    </span>
  );
}

export function TechnicalStack() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-10 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            Technical Capabilities
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Technologies We Work With
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Our engineering toolkit spans cloud platforms, infrastructure automation, containers,
            delivery pipelines, security and observability — allowing us to design and operate
            modern infrastructure around your technical requirements.
          </p>
        </div>

        {/* Core technologies — the flagship stack, highlighted above the wider ecosystem */}
        <div className="mb-10 rounded-[20px] border border-brand/20 bg-brand/[0.04] p-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            Core Technologies
          </span>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {CORE_TECHNOLOGIES.map((item) => (
              <Chip key={item} label={item} emphasis />
            ))}
          </div>
        </div>

        {/* Broader ecosystem, grouped into engineering categories */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TECHNOLOGY_CATEGORIES.map((category) => (
            <div
              key={category.label}
              className="rounded-[20px] border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:border-brand hover:bg-brand/[0.04] hover:shadow-md"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {category.label}
              </span>
              <span className="mt-2 block h-0.5 w-6 rounded-full bg-brand/40" />
              <div className="mt-4 flex flex-wrap gap-2">
                {category.items.map((item) => (
                  <Chip key={item} label={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
