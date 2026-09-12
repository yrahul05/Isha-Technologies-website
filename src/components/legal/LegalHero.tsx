interface LegalHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  effectiveDate: string;
  lastUpdated: string;
}

export function LegalHero({
  eyebrow,
  title,
  description,
  effectiveDate,
  lastUpdated,
}: LegalHeroProps) {
  return (
    <section className="relative bg-gradient-to-b from-blue-50/70 via-white to-white border-b border-gray-100 py-14 md:py-20">
      <div className="max-w-[860px] mx-auto px-4 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand border border-brand/30 bg-brand/5 px-3 py-1 rounded-full mb-4">
          {eyebrow}
        </span>
        <h1 className="font-bold text-3xl md:text-5xl tracking-tighter text-black leading-tight mb-4">
          {title}
        </h1>
        <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto mb-6">
          {description}
        </p>
        <div className="inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-gray-200 pt-4 text-xs font-medium text-gray-500">
          <span>
            Effective Date:{' '}
            <span className="font-semibold text-gray-800">{effectiveDate}</span>
          </span>
          <span className="hidden text-gray-300 sm:inline">|</span>
          <span>
            Last Updated:{' '}
            <span className="font-semibold text-gray-800">{lastUpdated}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
