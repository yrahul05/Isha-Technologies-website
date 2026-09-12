import type { CaseStudy } from '@/types/case-study';
import { AlertTriangle } from 'lucide-react';

export function CaseStudyProblem({ study }: { study: CaseStudy }) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 md:grid-cols-[minmax(0,280px)_1fr] md:gap-16">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            The Problem
          </span>
        </div>
        <div className="space-y-4">
          {study.problem.map((paragraph, idx) => (
            <p key={idx} className="max-w-2xl text-base leading-relaxed text-slate-600">
              {paragraph}
            </p>
          ))}

          <div className="mt-8">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Engineering Challenges
            </span>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {study.challenges.map((challenge) => (
                <li
                  key={challenge}
                  className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-sm text-slate-700"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
                  {challenge}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
