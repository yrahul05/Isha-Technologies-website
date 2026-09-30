'use client';

import type { ServiceProcessStep } from '@/types/types';
import { motion } from 'framer-motion';

function StepMarker({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      whileHover={{ scale: 1.08, transition: { duration: 0.2, ease: 'easeOut' } }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: index * 0.08 }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand bg-white text-sm font-semibold text-brand transition-colors duration-300 ease-out group-hover:border-brand group-hover:bg-brand group-hover:text-white"
    >
      {index + 1}
    </motion.div>
  );
}

export function ServiceProcess({ steps }: { steps: ServiceProcessStep[] }) {
  return (
    <section className="bg-brand/[0.03] py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-10 max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            How We Approach It
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            A Structured, Repeatable Process
          </h2>
        </div>

        {/* One ordered list for every viewport — a vertical timeline on
            mobile, a horizontal one from md up. Rendered once (not as
            separate desktop and mobile copies) so each step heading appears
            a single time in the DOM and accessibility tree. */}
        <ol className="flex flex-col md:flex-row md:items-start">
          {steps.map((step, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === steps.length - 1;
            return (
              <li
                key={step.title}
                className="group flex gap-4 transition-transform duration-300 ease-out md:flex-1 md:flex-col md:items-center md:gap-0 md:text-center md:hover:-translate-y-0.5 motion-reduce:md:hover:translate-y-0"
              >
                <div className="flex flex-col items-center md:w-full md:flex-row">
                  <span
                    aria-hidden="true"
                    className={`hidden h-px flex-1 md:block ${isFirst ? 'bg-transparent' : 'bg-brand/25'}`}
                  />
                  <StepMarker index={idx} />
                  <span
                    aria-hidden="true"
                    className={`hidden h-px flex-1 md:block ${isLast ? 'bg-transparent' : 'bg-brand/25'}`}
                  />
                  {!isLast && <span aria-hidden="true" className="w-px flex-1 bg-brand/25 md:hidden" />}
                </div>
                <div className="pb-6 md:flex md:flex-col md:items-center md:pb-0">
                  <h3 className="pt-1.5 text-sm font-semibold text-slate-900 transition-colors duration-300 ease-out group-hover:text-brand md:mt-3 md:pt-0">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 md:max-w-[11rem]">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
