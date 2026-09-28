'use client';

import type { JSX } from 'react';
import { AIOpsInvestigationVisual } from './AIOpsInvestigationVisual';
import { AIWorkloadInfrastructureVisual } from './AIWorkloadInfrastructureVisual';
import { CloudArchitectureVisual } from './CloudArchitectureVisual';
import { CloudSecurityVisual } from './CloudSecurityVisual';
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
  'cloud-migration-modernization': MigrationArchitectureVisual,
  'managed-cloud': ManagedCloudOperationsVisual,
  'cloud-cost-optimization-finops': CostOptimizationVisual,
  'devops-solutions': DevOpsPipelineVisual,
  devsecops: DevSecOpsPipelineVisual,
  'platform-engineering': PlatformEngineeringVisual,
  'infrastructure-as-code-gitops': TerraformWorkflowVisual,
  'kubernetes-container-platforms': KubernetesClusterVisual,
  'observability-monitoring': ObservabilitySignalsVisual,
  'site-reliability-engineering': ReliabilityArchitectureVisual,
  'ai-powered-devops-aiops': AIOpsInvestigationVisual,
  'ai-cloud-infrastructure': AIWorkloadInfrastructureVisual,
  'cloud-security': CloudSecurityVisual,
};

/**
 * Renders the service-specific hero visual for a given slug. Every one of
 * the 14 services gets its own component (see `VISUALS` above) built from
 * the shared primitives in `./primitives` — same visual language, unique
 * architecture per service.
 */
export function ServiceHeroVisual({ slug }: { slug: string }) {
  const Visual = VISUALS[slug] ?? CloudArchitectureVisual;
  return <Visual />;
}
