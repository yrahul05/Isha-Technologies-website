'use client';

import { ServiceHeroVisual } from '@/components/services/visuals/ServiceHeroVisual';
import type { CaseStudy } from '@/types/case-study';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

function MiniBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

/**
 * A single case study "card" in the filterable list. Alternates the visual
 * and text columns by index so the page reads as visual storytelling rather
 * than a repeated grid — each row still stays compact per the card-design
 * rules (short summary + three mini blocks, not full paragraphs).
 */
export function CaseStudyRow({ study, index }: { study: CaseStudy; index: number }) {
  const reversed = index % 2 === 1;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="card-hover group rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm md:p-8"
    >
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
        <div
          className={`flex justify-center rounded-2xl border border-gray-100 bg-brand/[0.03] py-8 transition-transform duration-300 ease-out group-hover:scale-[1.02] ${
            reversed ? 'md:order-2' : 'md:order-1'
          }`}
        >
          <ServiceHeroVisual slug={study.visualSlug} />
        </div>

        <div className={reversed ? 'md:order-1' : 'md:order-2'}>
          <div className="flex items-center gap-3">
            <span className="card-accent text-3xl font-bold text-brand/15 transition-colors duration-300 ease-out md:text-4xl">
              {study.number}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Technical Engineering Demonstration
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-brand">
                {study.displayCategory}
              </span>
            </div>
          </div>

          <h3 className="mt-4 text-xl font-bold leading-snug tracking-tight text-slate-900 md:text-2xl">
            {study.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base">
            {study.summary}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniBlock label="Problem" text={study.cardProblem} />
            <MiniBlock label="Approach" text={study.cardApproach} />
            <MiniBlock label="Solution" text={study.cardSolution} />
          </div>

          <Link
            href={`/case-studies/${study.slug}`}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
          >
            View Case Study
            <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
