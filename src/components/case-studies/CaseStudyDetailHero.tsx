'use client';

import { ServiceHeroVisual } from '@/components/services/visuals/ServiceHeroVisual';
import { Button } from '@/components/ui/button';
import type { CaseStudy } from '@/types/case-study';
import { ArrowLeft, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function CaseStudyDetailHero({ study }: { study: CaseStudy }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand/5">
      <div className="mx-auto max-w-[1280px] px-4 pt-8">
        <Link
          href="/case-studies"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          All Case Studies
        </Link>
      </div>

      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-10 md:py-14 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-brand bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
              {study.displayCategory}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Representative Engineering Scenario
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tighter text-slate-900 md:text-4xl lg:text-[2.5rem] lg:leading-[1.15]">
            {study.title}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
            {study.intro}
          </p>

          <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-xs leading-relaxed text-slate-500">
              Representative engineering scenario. This example demonstrates the type of
              infrastructure challenge Isha Technologies can address and is not presented as a
              verified client engagement.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <Button asChild variant="primary" className="h-11 rounded-lg px-6">
              <Link href="/contact">Talk to an Expert</Link>
            </Button>
            <Button asChild variant="secondary" className="h-11 rounded-lg px-6">
              <Link href={`/services/${study.relatedService}`}>{study.ctaLabel}</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
          className="flex justify-center rounded-2xl border border-gray-200 bg-white/60 py-6 lg:justify-end"
        >
          <ServiceHeroVisual slug={study.visualSlug} />
        </motion.div>
      </div>
    </section>
  );
}
