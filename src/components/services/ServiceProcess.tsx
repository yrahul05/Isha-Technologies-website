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

        {/* Desktop / tablet: horizontal timeline */}
        <div className="hidden md:flex md:items-start">
          {steps.map((step, idx) => (
            <div
              key={step.title}
              className="group flex flex-1 flex-col items-center text-center transition-transform duration-300 ease-out hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
            >
              <div className="flex w-full items-center">
                <span className={`h-px flex-1 ${idx === 0 ? 'bg-transparent' : 'bg-brand/25'}`} />
                <StepMarker index={idx} />
                <span
                  className={`h-px flex-1 ${idx === steps.length - 1 ? 'bg-transparent' : 'bg-brand/25'}`}
                />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 transition-colors duration-300 ease-out group-hover:text-brand">
                {step.title}
              </h3>
              <p className="mt-1 max-w-[11rem] text-sm leading-relaxed text-slate-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="flex flex-col md:hidden">
          {steps.map((step, idx) => (
            <div key={step.title} className="group flex gap-4">
              <div className="flex flex-col items-center">
                <StepMarker index={idx} />
                {idx < steps.length - 1 && <span className="w-px flex-1 bg-brand/25" />}
              </div>
              <div className="pb-6">
                <h3 className="pt-1.5 text-sm font-semibold text-slate-900 transition-colors duration-300 ease-out group-hover:text-brand">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
