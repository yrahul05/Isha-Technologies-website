'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * The About page's "Certified Cloud & DevOps Engineers" identity badge.
 * Same box/border treatment as before, refined typography, and a slow
 * text carousel through positioning phrases (not separate certification
 * claims). Pauses on the first phrase under prefers-reduced-motion.
 */
const PHRASES = [
  'Certified Cloud & DevOps Engineers',
  'Cloud Infrastructure Specialists',
  'DevOps & Automation Experts',
  'Infrastructure Engineering Team',
];

export function CertifiedBadge() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
    }, 3500);
    return () => clearInterval(id);
  }, [reduce]);

  const activeIndex = reduce ? 0 : index;

  return (
    <h2 className="card-hover relative mx-auto flex h-[60px] w-full items-center justify-center overflow-hidden rounded-[20px] border border-dashed border-brand bg-white px-6 shadow-md sm:h-16 sm:px-7 md:h-[68px] md:px-8">
      <AnimatePresence mode="wait">
        <motion.span
          key={activeIndex}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center whitespace-nowrap px-6 text-center text-[17px] font-semibold leading-[1.2] tracking-[0.015em] text-brand sm:px-7 sm:text-[19px] md:px-8 md:text-[21px]"
        >
          {PHRASES[activeIndex]}
        </motion.span>
      </AnimatePresence>
    </h2>
  );
}
