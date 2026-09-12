'use client';

import { Activity, Database, Globe, KeyRound, Layers, Network, Waypoints, Users } from 'lucide-react';
import { HConnector, SatelliteBadge, VConnector, VisualCanvas, VisualNode } from './primitives';

/** Cloud Solutions — a well-architected request path from user to data. */
export function CloudArchitectureVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <VisualNode icon={Users} label="Users" delay={0} />
        <VConnector delay={0} />
        <VisualNode icon={Globe} label="DNS" delay={0.1} />
        <VConnector delay={0.2} />

        <div className="flex items-center gap-2">
          <VisualNode icon={Waypoints} label="Load Balancer" delay={0.2} emphasis />
          <div className="hidden sm:block">
            <HConnector delay={0.3} width={16} />
          </div>
          <div className="hidden sm:block">
            <SatelliteBadge icon={KeyRound} label="Identity & Access" delay={0.3} />
          </div>
        </div>
        <VConnector delay={0.4} />

        <VisualNode icon={Layers} label="Application Layer" delay={0.4} />
        <VConnector delay={0.6} />

        <div className="flex items-center gap-2">
          <VisualNode icon={Database} label="Database / Storage" delay={0.6} emphasis />
          <div className="hidden sm:block">
            <HConnector delay={0.7} width={16} />
          </div>
          <div className="hidden sm:block">
            <SatelliteBadge icon={Activity} label="High Availability" delay={0.7} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <SatelliteBadge icon={Network} label="Networking" delay={0.5} />
          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            Compute · Storage · Networking
          </span>
        </div>
      </div>
    </VisualCanvas>
  );
}
