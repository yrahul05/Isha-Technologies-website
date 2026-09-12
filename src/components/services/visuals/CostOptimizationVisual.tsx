'use client';

import { Boxes, Database, Gauge, HardDrive, Search, Server, SlidersHorizontal } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { VConnector, VisualCanvas, VisualNode } from './primitives';

const RESOURCE_ICONS = [Server, HardDrive, Database, Boxes];

/** Cloud Cost Optimization — over-provisioned resources narrow into an efficient, right-sized footprint. */
export function CostOptimizationVisual() {
  const reduce = useReducedMotion();

  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Cloud Resources
        </span>
        <div className="mt-2 flex items-center gap-1.5">
          {RESOURCE_ICONS.map((Icon, idx) => (
            <motion.span
              key={idx}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-400"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={reduce ? { opacity: 1, scale: 1 } : { opacity: 1, scale: [1, 0.92, 1] }}
              transition={{ duration: 3, repeat: reduce ? 0 : Infinity, ease: 'easeInOut', delay: idx * 0.15 }}
            >
              <Icon className="h-3 w-3" strokeWidth={1.75} />
            </motion.span>
          ))}
        </div>

        <VConnector delay={0.1} />
        <VisualNode icon={Search} label="Resource Analysis" delay={0.1} />
        <VConnector delay={0.3} />
        <VisualNode icon={SlidersHorizontal} label="Rightsizing" delay={0.3} />
        <VConnector delay={0.5} />
        <VisualNode icon={Gauge} label="Optimization" delay={0.5} />
        <VConnector delay={0.7} />
        <VisualNode icon={Server} label="Efficient Infrastructure" delay={0.7} emphasis />

        <p className="mt-3 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          compute · storage · databases · kubernetes
        </p>
      </div>
    </VisualCanvas>
  );
}
