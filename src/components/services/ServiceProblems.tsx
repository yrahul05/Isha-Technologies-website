'use client';

import { iconMap } from '@/data/icon-map';
import type { ServiceProblem } from '@/types/types';
import { motion } from 'framer-motion';

export function ServiceProblems({ problems }: { problems: ServiceProblem[] }) {
  if (!problems.length) return null;

  return (
    <section className="bg-brand/[0.03] py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-10 max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            The Challenge
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Problems This Service Solves
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {problems.map((problem, idx) => {
            const Icon = iconMap[problem.icon];
            return (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: idx * 0.06 }}
                className="flex items-start gap-4 rounded-[20px] border border-gray-200 bg-white p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                  <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-slate-900">
                    {problem.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {problem.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
