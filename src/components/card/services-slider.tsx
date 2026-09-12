import Image from 'next/image';
import { Button } from '../ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../ui/carousel';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

import { services } from '@/data/data';
import Link from 'next/link';

// Concise, non-truncated card copy for this carousel only — the fuller
// descriptions in `services` (used on /services and in the footer/nav)
// are left untouched. Same meaning, just shorter, so nothing here is
// ever cut off with an ellipsis.
const cardBlurbs: Record<string, string> = {
  'Cloud Solutions':
    'Cloud architecture and infrastructure across AWS, Azure and Google Cloud.',
  'DevOps Solutions':
    'CI/CD, GitOps and Infrastructure as Code with Terraform and Ansible.',
  Kubernetes:
    'Production-ready Kubernetes platforms for scalable container workloads.',
  'Cloud Migration':
    'Structured migration planning, execution and optimization across cloud platforms.',
  'Managed Cloud':
    'Reliable infrastructure operations — monitoring, incident support and capacity planning.',
  'Cloud Cost Optimization':
    'Improve cloud efficiency without compromising performance or scale.',
  DevSecOps:
    'Security integrated into the delivery lifecycle, from code to deployment.',
  'Platform Solutions':
    'Internal developer platforms and self-service infrastructure for teams.',
  'Site Reliability':
    'Reliability engineered into production systems, from SLOs to incident response.',
  Observability:
    'Metrics, logs and traces turned into real operational visibility.',
};

export function ServicesSlider() {
  return (
    <div className="md:px-0 px-4">
      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
      >
        <CarouselContent>
          {services.map((service, index) => (
            <CarouselItem
              key={index}
              className="basis-full sm:basis-1/2 lg:basis-1/4 mb-2 py-4"
            >
              {/* Whole card navigates — the bottom "Explore service" text is
                  a visual cue, not a second nested link. */}
              <Link href={service.link} className="group block h-full">
                <div className="flex h-[270px] flex-col rounded-[18px] border border-slate-900/[0.08] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:border-brand/30 group-hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)]">
                  {/* Index + affordance arrow */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wide text-slate-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
                  </div>

                  {/* Icon */}
                  <div className="card-accent-bg relative mt-3 h-11 w-11 shrink-0 rounded-[14px] border border-brand/10 bg-brand/5 p-2.5 transition-transform duration-200 ease-out group-hover:scale-105">
                    <Image
                      src={service.image}
                      alt=""
                      fill
                      className="object-contain p-2"
                    />
                  </div>

                  {/* Title + description */}
                  <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight text-black transition-colors duration-200 ease-out group-hover:text-brand">
                    {service.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">
                    {cardBlurbs[service.title] ?? service.description}
                  </p>

                  {/* Explore service — pinned to the bottom regardless of
                      description length, so every card lines up evenly. */}
                  <div className="mt-auto flex items-center gap-1.5 pt-3 text-sm font-semibold text-brand">
                    Explore service
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* next & previous */}
        <CarouselPrevious
          aria-label="Previous services"
          className="size-10 -left-2 border-black/10 shadow-sm hover:border-brand hover:bg-white hover:text-brand hover:shadow-md sm:-left-4"
        />
        <CarouselNext
          aria-label="Next services"
          className="size-10 -right-2 border-black/10 shadow-sm hover:border-brand hover:bg-white hover:text-brand hover:shadow-md sm:-right-4"
        />
      </Carousel>

      <div className="flex items-center justify-center mt-10">
        <Button
          asChild
          variant="secondary"
          className="font-medium h-10 text-sm"
        >
          <Link href={'/services'} className="w-max">
            Explore Services
          </Link>
        </Button>
      </div>
    </div>
  );
}
