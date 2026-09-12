import type { Service } from '@/types/types';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function ServiceNavigation({
  previous,
  next,
}: {
  previous: Service | null;
  next: Service | null;
}) {
  if (!previous && !next) return null;

  return (
    <nav
      aria-label="Service navigation"
      className="border-y border-gray-100 bg-white"
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 text-sm">
        {previous ? (
          <Link
            href={`/services/${previous.slug}`}
            className="group flex items-center gap-2 text-slate-500 hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-out group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">{previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/services/${next.slug}`}
            className="group flex items-center gap-2 text-slate-500 hover:text-brand"
          >
            <span className="hidden sm:inline">{next.title}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}
