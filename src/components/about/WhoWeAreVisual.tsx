'use client';

import { Terminal, Users } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * "Who We Are" visual — a static, premium engineering + team mark framed
 * like a photo card. Deliberately NOT an animated network (that language
 * belongs to the Home hero's `HeroEcosystemVisual`): the only motion here
 * is a one-time entrance when the section scrolls into view, plus a
 * gentle hover scale — nothing continuous, no nodes, no orbit.
 */
export function WhoWeAreVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative mx-auto aspect-[4/3] w-full max-w-[420px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md"
    >
      <span className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-brand to-brand/30" />

      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-br from-brand/5 via-white to-slate-50 px-8 py-10"
      >
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full opacity-40">
          <defs>
            <pattern id="who-we-are-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.6" className="fill-brand/10" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#who-we-are-grid)" />
        </svg>

        <div className="relative flex h-28 w-28 items-center justify-center rounded-[26px] border border-brand/15 bg-white shadow-lg md:h-32 md:w-32">
          <Terminal className="h-12 w-12 text-brand" strokeWidth={1.5} />
          <span className="absolute -bottom-3 -right-3 flex h-11 w-11 items-center justify-center rounded-2xl border-4 border-white bg-brand shadow-md">
            <Users className="h-5 w-5 text-white" strokeWidth={1.8} />
          </span>
        </div>

        <div className="relative text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand/70">
            Engineering Culture
          </p>
          <p className="mt-1 text-sm font-medium text-slate-600">
            People building the foundations, together
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
