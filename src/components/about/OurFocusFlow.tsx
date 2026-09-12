'use client';

import { motion, useReducedMotion } from 'framer-motion';

type FocusArea = {
  number: string;
  title: string;
  description: string;
};

const FOCUS_AREAS: FocusArea[] = [
  {
    number: '01',
    title: 'Cloud Infrastructure',
    description: 'Designing scalable, secure and maintainable cloud foundations.',
  },
  {
    number: '02',
    title: 'Automation',
    description:
      'Reducing repetitive operational work through Infrastructure as Code, CI/CD and engineering automation.',
  },
  {
    number: '03',
    title: 'Platform & DevOps',
    description:
      'Creating consistent systems for building, deploying and operating modern applications.',
  },
  {
    number: '04',
    title: 'Reliability',
    description:
      'Improving resilience, visibility and operational readiness across production environments.',
  },
];

// Horizontal connected-node flow on desktop (numbered markers joined by an
// animated progress line), collapsing to a 2x2 grid on tablet and a single
// column on mobile — no large cards, just compact editorial items.
export function OurFocusFlow() {
  const reduce = useReducedMotion();

  return (
    <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-4 lg:gap-x-0">
      {FOCUS_AREAS.map((area, i) => (
        <motion.div
          key={area.number}
          className="group relative lg:px-5 lg:first:pl-0 lg:last:pr-0"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.1 }}
        >
          {i > 0 && (
            <div className="absolute left-0 top-5 hidden h-px w-full -translate-x-1/2 bg-gray-200 lg:block">
              <motion.div
                className="h-full origin-left bg-brand/60"
                initial={{ scaleX: reduce ? 1 : 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.15 }}
              />
            </div>
          )}

          <div className="relative z-10 flex items-start gap-4 lg:flex-col lg:items-start lg:gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-white text-sm font-bold text-brand transition-colors duration-300 ease-out group-hover:border-brand group-hover:bg-brand group-hover:text-white">
              {area.number}
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-black transition-colors duration-300 ease-out group-hover:text-brand">
                {area.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                {area.description}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
