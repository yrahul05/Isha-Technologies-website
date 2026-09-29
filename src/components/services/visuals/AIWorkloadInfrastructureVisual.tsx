'use client';

import { Activity, Cpu, HardDrive, Layers, Lock, PiggyBank, Ship, Waypoints, Zap } from 'lucide-react';
import { BoundaryFrame, MiniNode, VConnector, VisualCanvas, VisualNode } from './primitives';

const COMPUTE = [
  { icon: Cpu, label: 'CPU' },
  { icon: Zap, label: 'GPU' },
  { icon: Cpu, label: 'Accelerators' },
];

const PLATFORM_LAYER = [
  { icon: HardDrive, label: 'Storage' },
  { icon: Waypoints, label: 'Networking' },
  { icon: Activity, label: 'Observability' },
  { icon: Lock, label: 'Security' },
  { icon: PiggyBank, label: 'Cost' },
];

/** AI Cloud Infrastructure — an AI application's requests reach a
 * model-serving layer backed by a mix of compute (CPU, GPU, accelerators),
 * with storage, networking, security and cost management as the
 * supporting platform layer underneath. */
export function AIWorkloadInfrastructureVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <VisualNode icon={Layers} label="AI Application" delay={0} />
        <VConnector delay={0.1} height={16} />
        <VisualNode icon={Ship} label="Inference / Model Serving" delay={0.15} emphasis />
        <VConnector delay={0.25} height={16} />

        <BoundaryFrame label="Compute" delay={0.3}>
          <div className="flex items-center gap-2.5">
            {COMPUTE.map((item, idx) => (
              <MiniNode key={item.label} icon={item.icon} label={item.label} delay={0.35 + idx * 0.06} pulse />
            ))}
          </div>
        </BoundaryFrame>

        <VConnector delay={0.55} height={16} />

        <div className="flex flex-wrap items-center justify-center gap-2">
          {PLATFORM_LAYER.map((item, idx) => (
            <MiniNode key={item.label} icon={item.icon} label={item.label} delay={0.6 + idx * 0.06} />
          ))}
        </div>
      </div>
    </VisualCanvas>
  );
}
