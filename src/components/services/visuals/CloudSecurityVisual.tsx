'use client';

import {
  Activity,
  Database,
  KeyRound,
  Layers,
  Network,
  Search,
  Server,
  ShieldAlert,
} from 'lucide-react';
import { VConnector, VisualCanvas, VisualNode } from './primitives';

const LAYERS = [
  { icon: KeyRound, label: 'Identity' },
  { icon: Network, label: 'Network' },
  { icon: Layers, label: 'Application' },
  { icon: Server, label: 'Workload' },
  { icon: Database, label: 'Data' },
  { icon: Activity, label: 'Monitoring' },
];

/** Cloud Security — defense in depth: each layer (identity, network,
 * application, workload, data) is a distinct control, watched by
 * monitoring that feeds threat detection and, ultimately, response. */
export function CloudSecurityVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        {LAYERS.map((layer, idx) => (
          <div key={layer.label} className="flex flex-col items-center">
            <VisualNode icon={layer.icon} label={layer.label} delay={idx * 0.07} emphasis={idx === 0} />
            <VConnector delay={idx * 0.09} height={14} />
          </div>
        ))}

        <VisualNode icon={ShieldAlert} label="Threat Detection" delay={0.55} emphasis />
        <VConnector delay={0.65} height={14} />
        <VisualNode icon={Search} label="Response" delay={0.7} />
      </div>
    </VisualCanvas>
  );
}
