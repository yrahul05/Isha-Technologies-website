'use client';

import {
  Activity,
  Container,
  FileCode2,
  Hammer,
  Lock,
  PackageSearch,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { BoundaryFrame, VConnector, VisualCanvas, VisualNode } from './primitives';

/** DevSecOps — security checks form a protected zone in the middle of the delivery pipeline. */
export function DevSecOpsPipelineVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <VisualNode icon={FileCode2} label="Code" delay={0} pulse={false} />
        <VConnector delay={0} height={16} />
        <VisualNode icon={Hammer} label="Build" delay={0.1} pulse={false} />
        <VConnector delay={0.15} height={16} />

        <BoundaryFrame label="Security" delay={0.2}>
          <div className="flex flex-col items-center gap-2">
            <VisualNode icon={ShieldCheck} label="SAST" delay={0.2} />
            <VConnector delay={0.3} height={12} />
            <VisualNode icon={PackageSearch} label="Dependency Scan" delay={0.35} />
            <VConnector delay={0.45} height={12} />
            <VisualNode icon={Container} label="Container Scan" delay={0.5} />
            <VConnector delay={0.6} height={12} />
            <VisualNode icon={Lock} label="Security Gate" delay={0.65} emphasis />
          </div>
        </BoundaryFrame>

        <VConnector delay={0.8} height={16} />
        <VisualNode icon={UploadCloud} label="Deploy" delay={0.8} pulse={false} />
        <VConnector delay={0.9} height={16} />
        <VisualNode icon={Activity} label="Monitor" delay={0.9} pulse={false} />
      </div>
    </VisualCanvas>
  );
}
