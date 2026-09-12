import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function ServiceCTA({ heading }: { heading: string }) {
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
          {heading}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-slate-600">
          Tell us what you&apos;re building, where you&apos;re facing infrastructure challenges,
          and what you want to improve.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="primary" className="h-11 rounded-lg px-6">
            <Link href="/contact">Talk to an Expert</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
