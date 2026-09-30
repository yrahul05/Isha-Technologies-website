'use client';

import { Button } from '@/components/ui/button';
import { iconMap } from '@/data/icon-map';
import type { IconName } from '@/data/icon-map';
import { motion } from 'framer-motion';
import Link from 'next/link';

const CATEGORY_TILES: { label: string; icon: IconName; anchor: string }[] = [
  { label: 'Cloud & Infrastructure', icon: 'Cloud', anchor: 'cloud-infrastructure' },
  { label: 'DevOps & Platform', icon: 'Workflow', anchor: 'devops-platform' },
  { label: 'Cloud-Native', icon: 'Boxes', anchor: 'cloud-native' },
  { label: 'AI & Security', icon: 'ShieldCheck', anchor: 'ai-security' },
];

export function ExploreServicesHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand/5">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-16 md:py-20 lg:grid-cols-2 lg:gap-16">
        {/* CSS entrance so the H1 (LCP element) paints before hydration. */}
        <div className="space-y-5 motion-safe:animate-hero-rise">
          <span className="inline-flex rounded-full border border-brand text-brand bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Our Services
          </span>
          <h1 className="text-3xl font-bold tracking-tighter text-slate-900 md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            Cloud, DevOps &amp; AI Infrastructure Solutions
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
            Isha Technologies helps engineering teams design, automate and operate cloud
            infrastructure — from initial cloud architecture through delivery pipelines,
            Kubernetes platforms, reliability engineering and infrastructure security.
          </p>
          <p className="max-w-xl text-sm leading-relaxed text-slate-500">
            We work with startups scaling their first production environment, growing
            engineering teams standardizing their delivery process, and organizations
            modernizing infrastructure that has outgrown how it was originally built.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button asChild variant="primary" className="h-11 rounded-lg px-6">
              <Link href="/contact">Talk to an Expert</Link>
            </Button>
            <Button asChild variant="secondary" className="h-11 rounded-lg px-6">
              <Link href="#cloud-infrastructure">Browse Services</Link>
            </Button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
          className="grid grid-cols-2 gap-4"
        >
          {CATEGORY_TILES.map((tile, idx) => {
            const Icon = iconMap[tile.icon];
            return (
              <motion.a
                key={tile.label}
                href={`#${tile.anchor}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.2 + idx * 0.08 }}
                className="group flex flex-col justify-between gap-6 rounded-[20px] border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:border-brand hover:bg-brand/[0.04] hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="text-sm font-semibold leading-snug text-slate-900 group-hover:text-brand">
                  {tile.label}
                </span>
              </motion.a>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
