'use client';

import { Activity, AlertTriangle, Gauge, RotateCcw, Server, Target, Zap } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { VConnector, VisualCanvas, VisualNode } from './primitives';

const CHAIN = [
  { icon: Server, label: 'Service' },
  { icon: Target, label: 'SLO' },
  { icon: Activity, label: 'Monitoring' },
  { icon: Gauge, label: 'Error Budget' },
  { icon: AlertTriangle, label: 'Incident' },
  { icon: Zap, label: 'Response' },
];

/** Site Reliability Engineering — reliability as a continuous feedback
 * loop: a service is measured against an SLO, monitoring tracks the error
 * budget it creates, an incident triggers a response and recovery, and
 * what's learned feeds back into the next SLO — not a one-time setup. */
export function ReliabilityArchitectureVisual() {
  const reduce = useReducedMotion();

  return (
    <VisualCanvas>
      <div className="relative flex flex-col items-center py-6">
        {/* Signal traveling down the chain, representing the continuous
            feedback loop rather than a single request. */}
        <motion.span
          aria-hidden="true"
          className="absolute left-[calc(50%+18px)] h-1.5 w-1.5 rounded-full bg-brand/50"
          style={{ top: '8%' }}
          animate={reduce ? { opacity: 0 } : { top: ['8%', '88%'], opacity: [0, 1, 0] }}
          transition={{ duration: 2.6, repeat: reduce ? 0 : Infinity, ease: 'linear', repeatDelay: 1.4 }}
        />

        {CHAIN.map((node, idx) => (
          <div key={node.label} className="flex flex-col items-center">
            <VisualNode icon={node.icon} label={node.label} delay={idx * 0.08} />
            <VConnector delay={idx * 0.1} />
          </div>
        ))}

        <VisualNode icon={RotateCcw} label="Recovery & Learning" delay={0.6} emphasis />

        <p className="mt-3 max-w-[180px] text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Feeds back into the next SLO
        </p>
      </div>
    </VisualCanvas>
  );
}
