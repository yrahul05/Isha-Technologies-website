'use client';

import type { BlogTocEntry } from '@/types/blog';
import { ChevronDown, List } from 'lucide-react';
import { useEffect, useState } from 'react';

type TableOfContentsProps = {
  entries: BlogTocEntry[];
  /** Tailwind text-color utility for the active link (variant accent). */
  accentText: string;
};

/**
 * Renders twice — a native `<details>` disclosure on mobile/tablet (so a
 * long TOC doesn't push the article below the fold; costs zero JS to
 * collapse) and a sticky sidebar nav on desktop with scroll-spy highlighting
 * driven by IntersectionObserver. Both read the same `entries` array, so
 * there's one source of truth.
 */
export function TableOfContents({ entries, accentText }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (observedEntries) => {
        for (const observedEntry of observedEntries) {
          if (observedEntry.isIntersecting) {
            setActiveId(observedEntry.target.id);
          }
        }
      },
      { rootMargin: '-100px 0px -70% 0px', threshold: 0 }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  const linkClass = (id: string) =>
    `block border-l-2 py-1 pl-3 text-sm transition-colors ${
      activeId === id
        ? `${accentText} border-current font-semibold`
        : 'border-gray-100 text-gray-600 hover:border-gray-300 hover:text-black'
    }`;

  return (
    <>
      {/* Mobile / tablet: collapsible, no JS required to open/close */}
      <details className="mb-8 rounded-xl border border-gray-200 bg-gray-50/60 p-4 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-black">
          <span className="inline-flex items-center gap-2">
            <List className="h-4 w-4" />
            In This Article
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400 transition-transform [details[open]_&]:rotate-180" />
        </summary>
        <nav className="mt-3 flex flex-col gap-1">
          {entries.map((entry) => (
            <a key={entry.id} href={`#${entry.id}`} className={linkClass(entry.id)}>
              {entry.heading}
            </a>
          ))}
        </nav>
      </details>

      {/* Desktop: sticky sidebar with scroll-spy */}
      <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
          <List className="h-3.5 w-3.5" />
          In This Article
        </p>
        <nav className="flex flex-col gap-1">
          {entries.map((entry) => (
            <a key={entry.id} href={`#${entry.id}`} className={linkClass(entry.id)}>
              {entry.heading}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}
