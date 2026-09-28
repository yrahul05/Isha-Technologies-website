'use client';

import { Boxes, Gauge, Network, Server, Ship, Waypoints } from 'lucide-react';
import { BoundaryFrame, VConnector, VisualCanvas, VisualNode } from './primitives';

/** AI Cloud Infrastructure — requests routed to containerized model serving,
 * orchestrated on Kubernetes, backed by scalable, monitored compute. */
export function AIWorkloadInfrastructureVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <VisualNode icon={Waypoints} label="Requests" delay={0} />
        <VConnector delay={0.1} height={16} />
        <VisualNode icon={Network} label="Load Balancer" delay={0.15} />
        <VConnector delay={0.25} height={16} />
        <BoundaryFrame label="Kubernetes" delay={0.3}>
          <div className="flex items-center gap-3">
            <VisualNode icon={Ship} label="Model Serving" delay={0.35} emphasis />
            <VisualNode icon={Boxes} label="Autoscaling" delay={0.4} />
          </div>
        </BoundaryFrame>
        <VConnector delay={0.5} height={16} />
        <div className="flex items-center gap-3">
          <VisualNode icon={Server} label="Compute" delay={0.55} />
          <VisualNode icon={Gauge} label="Monitoring" delay={0.6} />
        </div>
      </div>
    </VisualCanvas>
  );
}
