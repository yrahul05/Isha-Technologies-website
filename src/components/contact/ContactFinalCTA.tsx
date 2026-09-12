'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { MouseEvent } from 'react';

export function ContactFinalCTA() {
  const scrollToForm = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section role="region" aria-labelledby="contact-final-cta-title" className="p-4">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-br from-brand via-brand/70 to-brand/20 p-8 py-8 md:py-12">
        <div className="space-y-3">
          <p className="text-center text-[13px] font-medium uppercase tracking-widest text-white/80">
            Ready to Talk?
          </p>
          <h2
            id="contact-final-cta-title"
            className="mx-auto max-w-2xl text-center text-[28px] font-semibold tracking-tighter leading-[1.15] text-white md:text-[34px] lg:text-[40px]"
          >
            Let&apos;s Discuss Your Infrastructure
          </h2>
          <p className="mx-auto max-w-[650px] text-center text-[15px] leading-[1.45] text-white md:text-base lg:text-[17px]">
            Bring us your current setup, technical challenge or growth plan. We&apos;ll help you
            identify a practical path forward.
          </p>
          <div className="flex shrink-0 flex-wrap justify-center gap-4 pt-1">
            <Button asChild variant="secondary" className="h-12">
              <a href="#contact-form" onClick={scrollToForm}>
                Talk to an Expert
              </a>
            </Button>
            <Button
              asChild
              className="h-12 border border-white/70 bg-transparent text-white hover:-translate-y-0.5 hover:bg-white hover:text-brand"
            >
              <Link href="/services">Explore Our Services</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
