'use client';

import { KeyRound, Lock, Search, Server } from 'lucide-react';
import { BoundaryFrame, VConnector, VisualCanvas, VisualNode } from './primitives';

/** Cloud Security — identity gates entry into a segmented, secured
 * workload boundary, with an audit trail watching from outside it. */
export function CloudSecurityVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <VisualNode icon={KeyRound} label="Identity & Access" delay={0} emphasis />
        <VConnector delay={0.15} height={16} />
        <BoundaryFrame label="Secured Boundary" delay={0.2}>
          <div className="flex items-center gap-3">
            <VisualNode icon={Lock} label="Secrets" delay={0.3} />
            <VisualNode icon={Server} label="Workloads" delay={0.35} />
          </div>
        </BoundaryFrame>
        <VConnector delay={0.5} height={16} />
        <VisualNode icon={Search} label="Audit Trail" delay={0.55} />
      </div>
    </VisualCanvas>
  );
}
