'use client';

import { CheckCircle2, Cloud, GitBranch, GitPullRequest, Search, UploadCloud } from 'lucide-react';
import { VConnector, VisualCanvas, VisualNode } from './primitives';

/** Infrastructure as Code & GitOps — Git as the source of truth: a change
 * becomes a reviewed pull request, a plan shows the effect before it
 * happens, and only an approved change is applied against real
 * infrastructure. */
export function TerraformWorkflowVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <VisualNode icon={GitBranch} label="Git Repository" delay={0} emphasis />
        <VConnector delay={0.1} height={16} />
        <VisualNode icon={GitPullRequest} label="Pull Request" delay={0.15} />
        <VConnector delay={0.25} height={16} />
        <VisualNode icon={Search} label="Plan" delay={0.3} />
        <VConnector delay={0.4} height={16} />
        <VisualNode icon={CheckCircle2} label="Review & Approval" delay={0.45} />
        <VConnector delay={0.55} height={16} />
        <VisualNode icon={UploadCloud} label="Apply / Sync" delay={0.6} emphasis />
        <VConnector delay={0.7} height={16} />
        <VisualNode icon={Cloud} label="Infrastructure" delay={0.75} />

        <div className="mt-4 flex items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            Terraform · Ansible · GitOps
          </span>
        </div>
      </div>
    </VisualCanvas>
  );
}
