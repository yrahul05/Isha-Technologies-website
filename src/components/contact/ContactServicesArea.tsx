'use client';

import { contactIntroServices } from '@/data/contact';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Selectable service pills shown above the contact info + form area.
 * Selection is a local, presentational toggle only — the authoritative
 * "Service Required" choice still lives on the form's own dropdown, so
 * this never blocks or overrides submission.
 */
export function ContactServicesArea() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-brand">
        Requirements
      </span>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
        What Can We Help With?
      </h2>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {contactIntroServices.map((service) => {
          const isSelected = selected === service;
          return (
            <button
              key={service}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelected(isSelected ? null : service)}
              className={`flex h-full items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-center text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                isSelected
                  ? 'border-brand bg-brand text-white'
                  : 'border-gray-200 bg-white text-slate-700 hover:border-brand hover:text-brand'
              }`}
            >
              {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
              {service}
            </button>
          );
        })}
      </div>
    </div>
  );
}
