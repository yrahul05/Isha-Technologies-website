import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function CaseStudiesFinalCTA() {
  return (
    <section role="region" aria-labelledby="case-studies-cta-title" className="p-4">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-br from-brand via-brand/70 to-brand/20 p-8 py-8 md:py-12">
        <div className="space-y-3">
          <h2
            id="case-studies-cta-title"
            className="mx-auto max-w-2xl text-center text-[28px] font-semibold tracking-tighter leading-[1.15] text-white md:text-[34px] lg:text-[40px]"
          >
            Have an Infrastructure Challenge?
          </h2>
          <p className="mx-auto max-w-[650px] text-center text-[15px] leading-[1.45] text-white md:text-base lg:text-[17px]">
            Tell us what you&apos;re building, where infrastructure is slowing your team down, or
            what you want to improve. We&apos;ll help you identify a practical technical path
            forward.
          </p>
          <div className="flex shrink-0 flex-wrap justify-center gap-4 pt-1">
            <Button asChild variant="secondary" className="h-12">
              <Link href="/contact">Talk to an Expert</Link>
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
