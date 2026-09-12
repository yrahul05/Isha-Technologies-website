'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface LegalSection {
  id: string;
  number: string;
  title: string;
}

export function LegalLayout({
  sections,
  children,
}: {
  sections: LegalSection[];
  children: ReactNode;
}) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    const headings = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-110px 0px -70% 0px', threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <section className="bg-white py-12 md:py-16">
      <div className="max-w-[1180px] mx-auto px-4">
        {/* Mobile / tablet table of contents */}
        <details className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 select-none">
            On this page
            <span className="text-xs font-medium text-brand">Tap to expand</span>
          </summary>
          <nav className="max-h-72 overflow-y-auto px-4 pb-3">
            <ul className="space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-white hover:text-brand"
                  >
                    <span className="text-xs font-semibold text-brand/70">
                      {s.number}
                    </span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </details>

        <div className="grid items-start gap-10 lg:grid-cols-[260px_1fr] lg:gap-14">
          {/* Desktop sticky table of contents */}
          <nav className="sticky top-24 hidden max-h-[calc(100vh-7rem)] self-start overflow-y-auto pr-2 lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              On this page
            </p>
            <ul className="space-y-1 border-l border-gray-200">
              {sections.map((s) => {
                const isActive = active === s.id;
                return (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={`-ml-px block border-l-2 py-1.5 pl-3 text-sm transition-colors duration-200 ${
                        isActive
                          ? 'border-brand font-semibold text-brand'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-1.5 text-xs">{s.number}</span>
                      {s.title}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Legal content */}
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </section>
  );
}
