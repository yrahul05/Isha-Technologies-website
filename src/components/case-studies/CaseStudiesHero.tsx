'use client';

import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export function CaseStudiesHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand/5 py-16 md:py-20">
      <div className="mx-auto max-w-[840px] px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <span className="inline-flex rounded-full border border-brand bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
            Case Studies
          </span>

          <h1 className="mt-5 text-3xl font-bold tracking-tighter text-slate-900 md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            Real Infrastructure Problems. Practical Engineering Solutions.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            Explore representative infrastructure scenarios covering cloud architecture, DevOps
            automation, Kubernetes, security, migration, reliability and observability.
          </p>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
            These technical demonstrations show how we approach common infrastructure challenges
            — from assessment and architecture to implementation, automation and operational
            improvement.
          </p>

          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" strokeWidth={1.75} />
            Technical Engineering Demonstrations
          </span>
        </motion.div>
      </div>
    </section>
  );
}
