'use client';

import { useEffect, useRef, useState } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { Quote } from 'lucide-react';

import { testimonials } from '@/data/data';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../ui/carousel';

type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  company: string;
};

export function Testimonials() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const autoplay = useRef(
    Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Only show testimonials that carry real attribution (name + company).
  const published = (testimonials as Testimonial[]).filter(
    (t) => t.name.trim() !== '' && t.company.trim() !== ''
  );

  if (published.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-2">
        <div className="card-hover bg-white border border-dashed border-brand/40 rounded-2xl shadow-md p-10 text-center">
          <p className="text-gray-600 leading-relaxed">
            Verified client feedback will be published here as our engagements
            progress.
          </p>
        </div>
      </div>
    );
  }

  // Duplicate the set so a 3-up loop always has slides on both sides — no blank
  // space during transitions.
  const slides =
    published.length >= 3 ? [...published, ...published] : published;

  return (
    <div className="max-w-6xl mx-auto mt-2 md:px-10">
      <Carousel
        opts={{ align: 'start', loop: true, slidesToScroll: 1 }}
        plugins={reducedMotion ? [] : [autoplay.current]}
      >
        {/* mx-0 / p-3 replace the -ml-6 + pl-6 gutter: each card is inset 12px
           from its slide edge so the border, rounded corners and hover lift/glow
           are never clipped by the carousel's overflow-hidden viewport. The 24px
           gap between cards (12px + 12px) is unchanged. */}
        <CarouselContent className="items-stretch mx-0">
          {slides.map((t, i) => (
            <CarouselItem
              key={i}
              aria-hidden={i >= published.length || undefined}
              className="basis-full sm:basis-1/2 lg:basis-1/3 flex p-3"
            >
              <figure className="card-hover h-full w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-7 flex flex-col gap-4">
                <Quote
                  className="card-accent text-brand/30 shrink-0"
                  size={34}
                  aria-hidden="true"
                />
                <blockquote className="text-[15px] sm:text-base font-normal tracking-normal leading-[1.55] text-gray-700 flex-1">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-auto">
                  <span className="block text-base font-semibold text-gray-900">
                    {t.name}
                  </span>
                  <span className="block text-sm font-normal text-gray-500">
                    {[t.designation, t.company].filter(Boolean).join(' · ')}
                  </span>
                </figcaption>
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>
        {published.length > 2 && (
          <>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </>
        )}
      </Carousel>
    </div>
  );
}
