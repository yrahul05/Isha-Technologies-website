'use client';

import { Button } from '@/components/ui/button';
import { ServiceHeroVisual } from '@/components/services/visuals/ServiceHeroVisual';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function ServiceHero({
  eyebrow,
  heading,
  description,
  slug,
}: {
  eyebrow: string;
  heading: string;
  description: string;
  slug: string;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand/5">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-16 md:py-20 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-5"
        >
          <span className="inline-flex rounded-full border border-brand text-brand bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {eyebrow}
          </span>
          <h1 className="text-3xl font-bold tracking-tighter text-slate-900 md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {heading}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
            {description}
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button asChild variant="primary" className="h-11 rounded-lg px-6">
              <Link href="/contact">Talk to an Expert</Link>
            </Button>
            <Button asChild variant="secondary" className="h-11 rounded-lg px-6">
              <Link href="/services">Explore Services</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
          className="flex justify-center lg:justify-end"
        >
          <ServiceHeroVisual slug={slug} />
        </motion.div>
      </div>
    </section>
  );
}
