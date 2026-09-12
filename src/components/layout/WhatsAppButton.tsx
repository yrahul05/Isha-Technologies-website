'use client';

import { useEffect, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { trackEvent } from '@/components/analytics/GoogleAnalytics';

// International format per brand guidelines: 919783959837 (+91 9783959837).
const WHATSAPP_MESSAGE = `Hello Isha Technologies 👋

I’d like to discuss my cloud, DevOps or infrastructure requirements with your team.

Please let me know how we can get started.

Thank you!`;

const WHATSAPP_URL = `https://wa.me/919783959837?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

/**
 * Site-wide floating WhatsApp contact button. Rendered once in the root
 * layout (outside Navbar/Footer) so it appears fixed above every page
 * without touching existing section markup. Uses the `FaWhatsapp` brand
 * glyph from react-icons (already used for other brand icons in this
 * project — see Footer's FaEnvelope/FaPhone) so it reads unmistakably as
 * WhatsApp rather than a generic chat icon.
 */
export function WhatsAppButton() {
  // Being `fixed`, this button would otherwise sit permanently over the
  // footer's bottom-right corner — exactly where the copyright/legal bar's
  // "Terms & Conditions" link lives — whenever a visitor scrolls to the
  // bottom of any page. Track the legal bar's live position on every
  // scroll/resize (throttled to one measurement per frame) and lift the
  // button so its bottom edge stays a fixed clearance above the bar's top
  // edge. Continuous tracking (rather than a one-shot observer trigger)
  // keeps this correct throughout the scroll gesture, not just at the
  // instant the bar first becomes visible.
  const [liftPx, setLiftPx] = useState(0);

  useEffect(() => {
    const legalBar = document.getElementById('footer-legal-bar');
    if (!legalBar) return;

    const CLEARANCE_PX = 16;
    let rafId: number | undefined;

    const measure = () => {
      const top = legalBar.getBoundingClientRect().top;
      // Any part of the bar visible (or past the bottom, e.g. an oversize
      // mobile keyboard) means we're close enough to start lifting.
      setLiftPx(top < window.innerHeight ? window.innerHeight - top + CLEARANCE_PX : 0);
    };

    const onScrollOrResize = () => {
      if (rafId !== undefined) return;
      rafId = requestAnimationFrame(() => {
        rafId = undefined;
        measure();
      });
    };

    measure();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  return (
    <div
      className="group fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 transition-[bottom] duration-300 ease-out sm:right-[calc(1.5rem+env(safe-area-inset-right))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
      style={liftPx > 0 ? { bottom: `${liftPx}px` } : undefined}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100"
      >
        Contact Us on WhatsApp
      </span>

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contact Us on WhatsApp"
        onClick={() => trackEvent('whatsapp_click')}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_24px_-8px_rgba(52,120,228,0.55)] outline-none transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#2f6ccd] hover:shadow-[0_14px_30px_-8px_rgba(52,120,228,0.6)] focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 sm:h-14 sm:w-14"
      >
        <FaWhatsapp className="h-5 w-5 text-[#25D366] sm:h-6 sm:w-6" />
      </a>
    </div>
  );
}
