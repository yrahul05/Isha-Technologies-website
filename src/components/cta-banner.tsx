import { Button } from '@/components/ui/button';
import { ScheduleMeetingButton } from '@/components/contact/ScheduleMeetingButton';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

type CTABannerProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  note?: string;
  /** Opt-in secondary "Schedule a Meeting" CTA — off by default so shared
   *  usages (e.g. blog post pages) are unaffected. */
  showScheduleMeeting?: boolean;
};

export function CTABanner({
  eyebrow,
  title = 'Ready to build reliable cloud infrastructure?',
  description = 'Contact Isha Technologies today to discuss cloud architecture, DevOps automation, Kubernetes, security, migration and observability — built around your platform.',
  ctaText = 'Talk to an Expert',
  ctaHref = '/contact',
  note,
  showScheduleMeeting = false,
}: CTABannerProps) {
  return (
    <section role="region" aria-labelledby="cta-title" className="p-4">
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-br from-brand via-brand/70 to-brand/20 p-8 md:py-12 py-8">
        <div className="space-y-3">
          {eyebrow && (
            <p className="text-center text-[13px] font-medium uppercase tracking-widest text-white/80">
              {eyebrow}
            </p>
          )}
          <h2
            id="cta-title"
            className="max-w-2xl mx-auto text-center text-white text-[28px] md:text-[34px] lg:text-[40px] font-semibold tracking-tighter leading-[1.15]"
          >
            {title}
          </h2>
          <p className="max-w-[650px] mx-auto text-center text-white text-[15px] leading-[1.45] md:text-base lg:text-[17px]">
            {description}
          </p>
          <div className="shrink-0 flex flex-wrap justify-center gap-3">
            <Button asChild variant="secondary" className="h-12">
              <Link href={ctaHref} aria-label={ctaText}>
                <MessageCircle />
                {ctaText}
              </Link>
            </Button>
            {showScheduleMeeting && (
              <ScheduleMeetingButton variant="secondary" className="h-12" />
            )}
          </div>
          {note && (
            <p className="text-center text-[13px] text-white/70">{note}</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default CTABanner;
