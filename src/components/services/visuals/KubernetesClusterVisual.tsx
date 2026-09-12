'use client';

import { Boxes, Cloud, Layers, Network, Package, Server, Waypoints } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { BoundaryFrame, VConnector, VisualCanvas, VisualNode } from './primitives';

function PodRow() {
  const reduce = useReducedMotion();
  const pods = [0, 1, 2, 3];
  return (
    <div className="flex items-center justify-center gap-1.5">
      {pods.map((i) => (
        <motion.span
          key={i}
          className="flex h-5 w-5 items-center justify-center rounded-md bg-brand/10 text-brand"
          initial={{ opacity: 0.9 }}
          animate={
            reduce
              ? undefined
              : i === 3
                ? { opacity: [0, 1, 1, 0], scale: [0.7, 1, 1, 0.7] } // autoscaled pod
                : { opacity: [1, 0.75, 1] }
          }
          transition={{
            duration: i === 3 ? 4.5 : 2.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.25,
          }}
        >
          <Package className="h-2.5 w-2.5" strokeWidth={2} />
        </motion.span>
      ))}
    </div>
  );
}

function NodeRow() {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1].map((i) => (
        <VisualNode key={i} icon={Server} label={`Node ${i + 1}`} delay={0.1 * i} pulse />
      ))}
    </div>
  );
}

/** Kubernetes — cluster hierarchy from ingress down to the nodes it runs on. */
export function KubernetesClusterVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <VisualNode icon={Waypoints} label="Ingress" delay={0} emphasis />
        <VConnector delay={0} />
        <VisualNode icon={Boxes} label="Services" delay={0.1} />
        <VConnector delay={0.2} />
        <VisualNode icon={Layers} label="Deployments" delay={0.2} />
        <VConnector delay={0.3} />

        <BoundaryFrame label="Cluster" delay={0.3} className="mt-1">
          <div className="flex flex-col items-center gap-2.5">
            <PodRow />
            <VConnector height={12} delay={0.4} />
            <NodeRow />
          </div>
        </BoundaryFrame>

        <VConnector delay={0.5} />
        <VisualNode icon={Cloud} label="Cloud" delay={0.5} />
        <span className="mt-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          <Network className="h-3 w-3 text-brand/50" /> production orchestration
        </span>
      </div>
    </VisualCanvas>
  );
}
