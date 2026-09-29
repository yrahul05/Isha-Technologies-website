'use client';

import { Activity, Cloud, Database, KeyRound, Layers, Waypoints } from 'lucide-react';
import { MiniNode, VConnector, VisualCanvas, VisualNode } from './primitives';

const PROVIDERS = ['AWS', 'Azure', 'Google Cloud', 'DigitalOcean', 'Hetzner'];

const CAPABILITIES = [
  { icon: Layers, label: 'Applications' },
  { icon: Database, label: 'Databases' },
  { icon: Waypoints, label: 'Networking' },
  { icon: KeyRound, label: 'Security' },
  { icon: Activity, label: 'Observability' },
];

/** Cloud Solutions — five providers unifying into one architected platform,
 * which then supports the actual application/data/network/security/
 * observability layers a team operates day to day. */
export function CloudArchitectureVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {PROVIDERS.map((provider, idx) => (
            <MiniNode key={provider} icon={Cloud} label={provider} delay={idx * 0.07} pulse />
          ))}
        </div>

        <VConnector delay={0.4} height={18} />
        <VisualNode icon={Cloud} label="Unified Cloud Architecture" delay={0.45} emphasis />
        <VConnector delay={0.6} height={18} />

        <div className="flex flex-wrap items-center justify-center gap-2">
          {CAPABILITIES.map((capability, idx) => (
            <MiniNode
              key={capability.label}
              icon={capability.icon}
              label={capability.label}
              delay={0.65 + idx * 0.06}
            />
          ))}
        </div>
      </div>
    </VisualCanvas>
  );
}
