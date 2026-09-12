'use client';

import { Activity, BellRing, Gauge, Server, Zap } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { VisualCanvas, VisualNode } from './primitives';

const LOOP = [
  { icon: Server, label: 'Infrastructure', top: '4%', left: '50%' },
  { icon: Activity, label: 'Monitoring', top: '28%', left: '93%' },
  { icon: BellRing, label: 'Alert', top: '80%', left: '76%' },
  { icon: Zap, label: 'Response', top: '80%', left: '24%' },
  { icon: Gauge, label: 'Optimization', top: '28%', left: '7%' },
];

/** Managed Cloud — a continuous operations loop: infrastructure feeds monitoring, alerts, response and optimization, back to infrastructure. */
export function ManagedCloudOperationsVisual() {
  const reduce = useReducedMotion();
  // Travels the loop as plain top/left percentages (same proven approach as
  // VConnector/HConnector) rather than animating SVG cx/cy attributes.
  const loopTops = [...LOOP, LOOP[0]].map((n) => n.top);
  const loopLefts = [...LOOP, LOOP[0]].map((n) => n.left);

  return (
    <VisualCanvas>
      <div className="relative mx-auto aspect-square w-full max-w-[280px] py-4">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
          <polygon
            points={LOOP.map((n) => `${parseFloat(n.left)},${parseFloat(n.top)}`).join(' ')}
            fill="none"
            strokeWidth="0.6"
            className="stroke-brand/25"
            strokeDasharray="2 3"
          />
        </svg>

        <motion.span
          aria-hidden="true"
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand"
          initial={{ top: LOOP[0].top, left: LOOP[0].left }}
          animate={reduce ? { top: LOOP[0].top, left: LOOP[0].left } : { top: loopTops, left: loopLefts }}
          transition={{ duration: 7, repeat: reduce ? 0 : Infinity, ease: 'linear' }}
        />

        {LOOP.map((node, idx) => (
          <div
            key={node.label}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: node.top, left: node.left }}
          >
            <VisualNode
              icon={node.icon}
              label={node.label}
              delay={idx * 0.12}
              emphasis={idx === 0}
              className="!px-2 !py-1"
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        monitoring · backup · performance · security · capacity
      </p>
    </VisualCanvas>
  );
}
