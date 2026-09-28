'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function ExploreServicesCTA() {
  return (
    <section className="bg-gradient-to-b from-white to-brand/5 py-16">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="mx-auto max-w-[720px] px-4 text-center"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-brand">
          Let&apos;s Talk Infrastructure
        </span>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Let&apos;s Build a Reliable Cloud &amp; DevOps Infrastructure
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-slate-600">
          Not sure which service fits your situation? Tell us what you&apos;re building and
          we&apos;ll help you figure out where to start.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Button asChild variant="primary" className="h-11 rounded-lg px-6">
            <Link href="/contact">Talk to an Expert</Link>
          </Button>
          <Button asChild variant="secondary" className="h-11 rounded-lg px-6">
            <Link href="/contact#contact-form">Request a Consultation</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
