'use client';

import { Bot, CheckCircle2, Search, ShieldCheck, Users, Waypoints, Wrench } from 'lucide-react';
import { BoundaryFrame, MiniNode, VConnector, VisualCanvas, VisualNode } from './primitives';

/** AWS Agent Registry — agents, MCP servers and skills flow into a
 * governed registry (discover, then govern & approve), and only approved,
 * published capabilities are reused across teams. Deliberately its own
 * visual identity (governance + discovery + security) rather than a
 * re-skinned service diagram — this blog post is the only place it's
 * used. */
export function AgentRegistryVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <MiniNode icon={Bot} label="Agents" delay={0} pulse />
          <MiniNode icon={Waypoints} label="MCP Servers" delay={0.07} pulse />
          <MiniNode icon={Wrench} label="Skills" delay={0.14} pulse />
        </div>
        <VConnector delay={0.25} height={16} />

        <BoundaryFrame label="Agent Registry" delay={0.3}>
          <div className="flex flex-col items-center gap-2.5">
            <VisualNode icon={Search} label="Discover" delay={0.35} />
            <VConnector height={10} delay={0.4} />
            <VisualNode icon={ShieldCheck} label="Govern & Approve" delay={0.45} emphasis />
          </div>
        </BoundaryFrame>

        <VConnector delay={0.6} height={16} />
        <VisualNode icon={CheckCircle2} label="Publish" delay={0.65} />
        <VConnector delay={0.75} height={16} />
        <VisualNode icon={Users} label="Reuse Across Teams" delay={0.8} emphasis />
      </div>
    </VisualCanvas>
  );
}
