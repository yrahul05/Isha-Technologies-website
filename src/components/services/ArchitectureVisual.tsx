'use client';

import { cn } from '@/lib/utils';
import type { VariantStyle } from '@/data/blog-variants';
import { iconMap } from '@/data/icon-map';
import type { ServiceArchitectureNode } from '@/types/types';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Shared architecture/flow diagram, used by both service pages (no
 * `variant` passed — renders with the exact original plain-brand styling,
 * byte-for-byte unchanged) and case studies (passes a topic variant so
 * each case study's flow diagram picks up its own accent color instead of
 * one flat blue). `variant` is opt-in rather than defaulted so the 14
 * existing service pages that already use this component are never
 * visually affected by this change.
 */
export function ArchitectureVisual({
  nodes,
  eyebrow = 'Architecture',
  heading = 'How the Pieces Connect',
  variant,
}: {
  nodes: ServiceArchitectureNode[];
  eyebrow?: string;
  heading?: string;
  variant?: VariantStyle;
}) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-10 max-w-xl">
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              variant ? variant.text : 'text-brand'
            )}
          >
            {eyebrow}
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {heading}
          </h2>
        </div>

        <div
          className={cn(
            'rounded-[24px] border border-gray-200 p-6 md:p-10',
            variant ? variant.soft : 'bg-brand/[0.03]'
          )}
        >
          {/* One ordered list of nodes for every viewport — a vertical flow on
              mobile, a wrapping horizontal flow from md up. Rendered once
              (not as separate desktop and mobile copies) so each label
              appears a single time in the DOM and accessibility tree. */}
          <ol className="flex flex-col items-center gap-3 md:flex-row md:flex-wrap md:justify-center">
            {nodes.map((node, idx) => {
              const Icon = iconMap[node.icon];
              const isLast = idx === nodes.length - 1;
              return (
                <li
                  key={node.label}
                  className="flex w-full flex-col items-center gap-3 md:w-auto md:flex-row"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    whileHover={{ y: -3, transition: { duration: 0.2, ease: 'easeOut' } }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: idx * 0.09 }}
                    className={cn(
                      'group flex w-full max-w-[220px] items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-[border-color,box-shadow] duration-300 ease-out hover:shadow-md md:w-32 md:max-w-none md:flex-col md:gap-2 md:px-3 md:py-4 md:text-center',
                      variant ? variant.border : 'hover:border-brand'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 ease-out group-hover:scale-110',
                        variant ? `${variant.soft} ${variant.text}` : 'bg-brand/10 text-brand'
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold text-slate-800 md:text-xs">
                      {node.label}
                    </span>
                  </motion.div>
                  {!isLast && (
                    <>
                      <ArrowDown
                        aria-hidden="true"
                        className={cn(
                          'h-4 w-4 shrink-0 md:hidden',
                          variant ? `opacity-40 ${variant.text}` : 'text-brand/40'
                        )}
                      />
                      <ArrowRight
                        aria-hidden="true"
                        className={cn(
                          'hidden h-4 w-4 shrink-0 md:block',
                          variant ? `opacity-40 ${variant.text}` : 'text-brand/40'
                        )}
                      />
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
