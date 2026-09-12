'use client';

import type { JSX } from 'react';
import { CloudArchitectureVisual } from './CloudArchitectureVisual';
import { CostOptimizationVisual } from './CostOptimizationVisual';
import { DevOpsPipelineVisual } from './DevOpsPipelineVisual';
import { DevSecOpsPipelineVisual } from './DevSecOpsPipelineVisual';
import { KubernetesClusterVisual } from './KubernetesClusterVisual';
import { ManagedCloudOperationsVisual } from './ManagedCloudOperationsVisual';
import { MigrationArchitectureVisual } from './MigrationArchitectureVisual';
import { ObservabilitySignalsVisual } from './ObservabilitySignalsVisual';
import { PlatformEngineeringVisual } from './PlatformEngineeringVisual';
import { ReliabilityArchitectureVisual } from './ReliabilityArchitectureVisual';
import { TerraformWorkflowVisual } from './TerraformWorkflowVisual';

const VISUALS: Record<string, () => JSX.Element> = {
  'cloud-solutions': CloudArchitectureVisual,
  'devops-solutions': DevOpsPipelineVisual,
  kubernetes: KubernetesClusterVisual,
  'cloud-migration': MigrationArchitectureVisual,
  'managed-cloud': ManagedCloudOperationsVisual,
  'cloud-cost-optimization': CostOptimizationVisual,
  devsecops: DevSecOpsPipelineVisual,
  'platform-solutions': PlatformEngineeringVisual,
  'site-reliability': ReliabilityArchitectureVisual,
  observability: ObservabilitySignalsVisual,
  terraform: TerraformWorkflowVisual,
};

/**
 * Renders the service-specific hero visual for a given slug. Every one of
 * the 10 services gets its own component (see `VISUALS` above) built from
 * the shared primitives in `./primitives` — same visual language, unique
 * architecture per service.
 */
export function ServiceHeroVisual({ slug }: { slug: string }) {
  const Visual = VISUALS[slug] ?? CloudArchitectureVisual;
  return <Visual />;
}
