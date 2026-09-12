import { iconMap } from '@/data/icon-map';
import type { ServiceArchitectureNode } from '@/types/types';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function ArchitectureVisual({
  nodes,
  eyebrow = 'Architecture',
  heading = 'How the Pieces Connect',
}: {
  nodes: ServiceArchitectureNode[];
  eyebrow?: string;
  heading?: string;
}) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-10 max-w-xl">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            {eyebrow}
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {heading}
          </h2>
        </div>

        <div className="rounded-[24px] border border-gray-200 bg-brand/[0.03] p-6 md:p-10">
          {/* Desktop / tablet: horizontal flow */}
          <div className="hidden flex-wrap items-center justify-center gap-3 md:flex">
            {nodes.map((node, idx) => {
              const Icon = iconMap[node.icon];
              return (
                <div key={node.label} className="flex items-center gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    whileHover={{ y: -3, transition: { duration: 0.2, ease: 'easeOut' } }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: idx * 0.1 }}
                    className="group flex w-32 flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-center shadow-sm transition-[border-color,box-shadow] duration-300 ease-out hover:border-brand hover:shadow-md"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand transition-transform duration-300 ease-out group-hover:scale-110">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{node.label}</span>
                  </motion.div>
                  {idx < nodes.length - 1 && (
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand/40" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile: vertical flow */}
          <div className="flex flex-col items-center gap-3 md:hidden">
            {nodes.map((node, idx) => {
              const Icon = iconMap[node.icon];
              return (
                <div key={node.label} className="flex flex-col items-center gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: idx * 0.08 }}
                    className="group flex w-full max-w-[220px] items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-[border-color,box-shadow] duration-300 ease-out hover:border-brand hover:shadow-md"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand transition-transform duration-300 ease-out group-hover:scale-110">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{node.label}</span>
                  </motion.div>
                  {idx < nodes.length - 1 && (
                    <ArrowDown className="h-4 w-4 shrink-0 text-brand/40" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
