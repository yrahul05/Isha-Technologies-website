export function ServiceOverview({
  heading,
  paragraphs,
  platforms,
}: {
  heading: string;
  paragraphs: string[];
  /** Cloud/hosting platform experience relevant to this service — not a partnership claim. */
  platforms?: string[];
}) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 md:grid-cols-[minmax(0,280px)_1fr] md:gap-16">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            The Service
          </span>
          {platforms && platforms.length > 0 && (
            <div className="mt-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cloud Platforms
              </span>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {platforms.join(', ')}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {heading}
          </h2>
          {paragraphs.map((paragraph, idx) => (
            <p key={idx} className="max-w-2xl text-base leading-relaxed text-slate-600">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
