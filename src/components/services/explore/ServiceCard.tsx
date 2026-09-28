'use client';

import { iconMap } from '@/data/icon-map';
import type { Service } from '@/types/types';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export function ServiceCard({ service, delay = 0 }: { service: Service; delay?: number }) {
  const Icon = iconMap[service.capabilities[0]?.icon ?? 'Server'];
  const techPreview = service.technologies[0]?.items.slice(0, 4) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      className="group flex h-full flex-col rounded-[20px] border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-brand hover:shadow-lg"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors duration-300 ease-out group-hover:bg-brand group-hover:text-white">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900">
        {service.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{service.description}</p>

      {techPreview.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {techPreview.map((item) => (
            <span
              key={item}
              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      <Link
        href={`/services/${service.slug}`}
        className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-brand"
      >
        Explore Service
        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </motion.div>
  );
}
