'use client';

import { Button } from '@/components/ui/button';
import { SIGNAL_URL, WHATSAPP_URL_PREFILLED } from '@/data/contact';
import { motion } from 'framer-motion';
import type { MouseEvent } from 'react';
import { SiSignal } from 'react-icons/si';
import { ContactVisual } from './ContactVisual';
import { ScheduleMeetingButton } from './ScheduleMeetingButton';

export function ContactHero() {
  const scrollToForm = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand/5">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-14 md:py-16 lg:grid-cols-2 lg:gap-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-5"
        >
          <span className="inline-flex rounded-full border border-brand bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
            Let&apos;s Connect
          </span>
          <h1 className="text-3xl font-bold tracking-tighter text-slate-900 md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            Let&apos;s Build the Right Infrastructure Together
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
            Tell us what you&apos;re building, what is slowing your infrastructure down, or where
            you want to improve. We&apos;ll review your requirements and help you identify the
            right technical path.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button asChild variant="primary" className="h-11 rounded-lg px-6">
              <a href="#contact-form" onClick={scrollToForm}>
                Talk to an Expert
              </a>
            </Button>
            <ScheduleMeetingButton className="h-11 rounded-lg px-6" />
            <Button asChild variant="secondary" className="h-11 rounded-lg px-6">
              <a
                href={WHATSAPP_URL_PREFILLED}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contact Us on WhatsApp"
              >
                Contact Us on WhatsApp
              </a>
            </Button>
          </div>

          {SIGNAL_URL ? (
            <a
              href={SIGNAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact Us on Signal"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors duration-200 ease-out hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-sm"
            >
              <SiSignal className="h-3.5 w-3.5" />
              Contact Us on Signal
            </a>
          ) : (
            <span
              aria-disabled="true"
              title="Signal link coming soon"
              className="inline-flex cursor-not-allowed items-center gap-1.5 text-sm font-medium text-slate-400"
            >
              <SiSignal className="h-3.5 w-3.5" />
              Contact Us on Signal
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                Coming soon
              </span>
            </span>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
          className="flex justify-center lg:justify-end"
        >
          <div className="w-full max-w-[500px] rounded-[28px] border border-gray-100 bg-white/70 p-6 shadow-sm md:p-8">
            <ContactVisual />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
