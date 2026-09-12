'use client';

import { motion } from 'framer-motion';

type WhyItem = {
  number: string;
  title: string;
  description: string;
};

const WHY_ITEMS: WhyItem[] = [
  {
    number: '01',
    title: 'Technical Expertise',
    description:
      'Cloud, Kubernetes, networking, Infrastructure as Code and platform engineering expertise grounded in practical implementation.',
  },
  {
    number: '02',
    title: 'Automation First',
    description:
      'Repeatable infrastructure, automated delivery and standardized environments reduce operational friction.',
  },
  {
    number: '03',
    title: 'Production Ready',
    description:
      'Security, observability, resilience and operational readiness are considered throughout the platform lifecycle.',
  },
  {
    number: '04',
    title: 'Transparent Execution',
    description:
      'Clear scope, visible progress and direct technical communication throughout the engagement.',
  },
];

// Premium asymmetric layout: editorial numbered rows on the right,
// instead of four generic equal-weight cards.
export function WhyIshaTechnologies() {
  return (
    <div className="divide-y divide-gray-200">
      {WHY_ITEMS.map((item, i) => (
        <motion.div
          key={item.number}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.08 }}
          className="group flex gap-5 py-6 first:pt-0 last:pb-0"
        >
          <span className="pt-1 text-sm font-semibold tracking-wide text-brand/50 transition-colors duration-300 ease-out group-hover:text-brand">
            {item.number}
          </span>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-black transition-colors duration-300 ease-out group-hover:text-brand md:text-xl">
              {item.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600 md:text-base">
              {item.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
