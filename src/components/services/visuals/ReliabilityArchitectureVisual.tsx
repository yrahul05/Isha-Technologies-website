'use client';

import { Activity, AlertTriangle, BellRing, Database, Layers, Network, Waypoints } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { VConnector, VisualCanvas, VisualNode } from './primitives';

const CHAIN = [
  { icon: Waypoints, label: 'Traffic' },
  { icon: Network, label: 'Load Balancer' },
  { icon: Layers, label: 'Application' },
  { icon: Database, label: 'Database' },
  { icon: Activity, label: 'Monitoring' },
];

/** Site Reliability — production traffic path with a continuous health signal and a controlled incident response. */
export function ReliabilityArchitectureVisual() {
  const reduce = useReducedMotion();

  return (
    <VisualCanvas>
      <div className="relative flex flex-col items-center py-6">
        {/* Health signal traveling back up the chain */}
        <motion.span
          aria-hidden="true"
          className="absolute left-[calc(50%+18px)] h-1.5 w-1.5 rounded-full bg-brand/50"
          style={{ top: '10%' }}
          animate={reduce ? { opacity: 0 } : { top: ['85%', '10%'], opacity: [0, 1, 0] }}
          transition={{ duration: 2.4, repeat: reduce ? 0 : Infinity, ease: 'linear', repeatDelay: 1.6 }}
        />

        {CHAIN.map((node, idx) => (
          <div key={node.label} className="flex flex-col items-center">
            <VisualNode icon={node.icon} label={node.label} delay={idx * 0.08} />
            <VConnector delay={idx * 0.1} />
          </div>
        ))}

        <VisualNode icon={BellRing} label="Alert" delay={0.5} emphasis />
        <VConnector delay={0.6} />
        <VisualNode icon={AlertTriangle} label="Incident Response" delay={0.65} emphasis />
      </div>
    </VisualCanvas>
  );
}
