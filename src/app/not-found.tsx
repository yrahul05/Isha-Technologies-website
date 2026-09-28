import { Button } from '@/components/ui/button';
import { ArrowRight, Home, Search } from 'lucide-react';
import Link from 'next/link';

const helpfulLinks = [
  { href: '/services', label: 'Explore Services' },
  { href: '/resources/blogs', label: 'Technical Resources' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/contact', label: 'Contact Us' },
];

/**
 * Next.js renders this for any unmatched route and correctly serves it
 * with a 404 HTTP status (not a fake 200 "soft 404"), so it's already
 * non-indexable without needing an explicit noindex tag.
 */
export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] items-center py-16">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tighter text-black md:text-4xl">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-4 text-gray-600">
          The page you&apos;re looking for may have moved or the link may be
          outdated. Here are some places to pick up from:
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="primary" className="h-11">
            <Link href="/">
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-11">
            <Link href="/contact">
              <Search className="h-4 w-4" />
              Talk to Us
            </Link>
          </Button>
        </div>

        <div className="mx-auto mt-10 grid max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
          {helpfulLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="card-hover flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:text-brand"
            >
              {link.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
