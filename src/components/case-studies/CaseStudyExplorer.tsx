'use client';

import { caseStudies, caseStudyFilters } from '@/data/case-studies';
import { useMemo, useState } from 'react';
import { CaseStudyRow } from './CaseStudyRow';

export function CaseStudyExplorer() {
  const [active, setActive] = useState<string>('All');

  const filtered = useMemo(
    () => (active === 'All' ? caseStudies : caseStudies.filter((study) => study.category === active)),
    [active]
  );

  return (
    <div>
      <div className="mb-10 flex flex-wrap gap-2">
        {caseStudyFilters.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActive(category)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors duration-200 ease-out ${
              active === category
                ? 'border-brand bg-brand text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-brand/40 hover:text-brand'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-8">
          {filtered.map((study, idx) => (
            <CaseStudyRow key={study.slug} study={study} index={idx} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          More engineering demonstrations for this category are on the way.
        </p>
      )}
    </div>
  );
}
