import type { ServiceTechGroup } from '@/types/types';

/** Renders the technologies relevant to THIS specific service only — not
 * the global capability list (see TechnicalStack, shown only on /services). */
export function ServiceTechnologies({ groups }: { groups: ServiceTechGroup[] }) {
  if (!groups.length) return null;

  return (
    <section className="bg-brand/[0.03] py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-10 max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            Technology &amp; Tooling
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            What We Use for This Service
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <div key={group.group} className="rounded-[20px] border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {group.group}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
