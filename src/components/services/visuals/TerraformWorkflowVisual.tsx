'use client';

import { CheckCircle2, Cloud, FileCode2, GitBranch, Search } from 'lucide-react';
import { SatelliteBadge, VConnector, VisualCanvas, VisualNode } from './primitives';

/** Terraform & IaC — the write → plan → apply → state workflow. */
export function TerraformWorkflowVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <VisualNode icon={FileCode2} label="Write Configuration" delay={0} />
        <VConnector delay={0.1} />

        <div className="flex items-center gap-2">
          <VisualNode icon={Search} label="Plan" delay={0.2} emphasis />
          <div className="hidden sm:block">
            <SatelliteBadge icon={GitBranch} label="Version Control" delay={0.3} />
          </div>
        </div>
        <VConnector delay={0.4} />

        <VisualNode icon={CheckCircle2} label="Apply" delay={0.4} />
        <VConnector delay={0.6} />

        <VisualNode icon={Cloud} label="Provisioned Infrastructure" delay={0.6} emphasis />

        <div className="mt-4 flex items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            Providers · Modules · Remote State
          </span>
        </div>
      </div>
    </VisualCanvas>
  );
}
