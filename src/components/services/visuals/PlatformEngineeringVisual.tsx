'use client';

import {
  Boxes,
  FileCode2,
  GitBranch,
  KeyRound,
  LayoutGrid,
  Layers,
  LineChart,
  Route,
  Server,
  UploadCloud,
  Users,
} from 'lucide-react';
import { HConnector, SatelliteBadge, VConnector, VisualCanvas, VisualNode } from './primitives';

// Hexagon offset so no satellite lands on the vertical chain line through the center.
const SATELLITES = [
  { icon: FileCode2, label: 'Terraform Modules', top: '15%', left: '70%' },
  { icon: Boxes, label: 'Kubernetes', top: '50%', left: '90%' },
  { icon: GitBranch, label: 'CI/CD', top: '85%', left: '70%' },
  { icon: Layers, label: 'Environments', top: '85%', left: '30%' },
  { icon: KeyRound, label: 'Secrets', top: '50%', left: '10%' },
  { icon: LineChart, label: 'Monitoring', top: '15%', left: '30%' },
];

/** Platform Solutions — reusable platform capabilities orbiting the internal platform a request flows through. */
export function PlatformEngineeringVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <VisualNode icon={Users} label="Developer" delay={0} />
        <VConnector delay={0.1} />

        <div className="relative aspect-square w-full max-w-[190px]">
          {SATELLITES.map((sat, idx) => (
            <div
              key={sat.label}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: sat.top, left: sat.left }}
            >
              <SatelliteBadge icon={sat.icon} label={sat.label} delay={0.2 + idx * 0.1} />
            </div>
          ))}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <VisualNode icon={LayoutGrid} label="Platform" delay={0.15} emphasis />
          </div>
        </div>

        <VConnector delay={0.3} />
        <VisualNode icon={Route} label="Templates / Golden Paths" delay={0.35} />
        <VConnector delay={0.45} />
        <VisualNode icon={Server} label="Infrastructure" delay={0.45} />
        <VConnector delay={0.55} />

        <div className="flex items-center gap-2">
          <VisualNode icon={UploadCloud} label="Deployment" delay={0.55} />
          <div className="hidden sm:block">
            <HConnector delay={0.7} width={14} />
          </div>
        </div>
      </div>
    </VisualCanvas>
  );
}
