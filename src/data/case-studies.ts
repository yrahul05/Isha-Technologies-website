import type { CaseStudy } from '@/types/case-study';
import type { Metadata } from 'next';

/**
 * CREDIBILITY RULE — read before editing this file.
 *
 * We do not have verified client project details that can be publicly
 * published. Every entry below is a "Technical Engineering Demonstration" /
 * "Representative Engineering Scenario" — it must never contain:
 * client names, company names, client logos, testimonials, revenue numbers,
 * cost savings, uptime percentages, deployment speed improvements, project
 * dates, team sizes, infrastructure sizes, before/after metrics, business
 * outcomes, or production claims. Content stays generic and illustrative of
 * how Isha Technologies approaches a class of infrastructure problem.
 */

export const caseStudyFilters = [
  'All',
  'Cloud Infrastructure',
  'DevOps',
  'Kubernetes',
  'Cloud Migration',
  'Cloud Security',
  'Cost Optimization',
  'Reliability',
  'Observability',
] as const;

export const caseStudies: CaseStudy[] = [
  // 01 — CI/CD Automation
  {
    slug: 'ci-cd-automation',
    number: '01',
    category: 'DevOps',
    displayCategory: 'DevOps Automation',
    title: 'Replacing Manual Deployments With a Reliable CI/CD Workflow',
    visualSlug: 'devops-solutions',
    summary:
      'A team relying on manual, environment-specific deployment steps struggles with inconsistent releases and difficult rollbacks. This scenario explores replacing that process with a standardized CI/CD workflow.',
    cardProblem: 'Manual, inconsistent deployments make releases slow and rollback difficult.',
    cardApproach: 'Design a standardized CI/CD workflow backed by Infrastructure as Code.',
    cardSolution: 'Code → Git → Build → Test → Security Scan → Container → Deploy → Verify.',
    intro:
      'A representative engineering scenario exploring how a standardized CI/CD workflow replaces manual, error-prone deployment steps with a repeatable, verifiable release process.',
    problem: [
      'The engineering team relies heavily on manual deployment steps. Releases require repeated configuration changes, environment-specific commands and manual verification.',
      'This creates inconsistent deployments, makes rollback difficult and increases the operational effort required for every release.',
    ],
    challenges: [
      'Manual deployment processes',
      'Environment inconsistencies',
      'Limited deployment standardization',
      'Difficult rollback procedures',
      'Repetitive operational work',
    ],
    approach: [
      'We design a standardized CI/CD workflow covering source control, build, testing, security checks, artifact creation and automated deployment.',
      'Infrastructure is managed through Infrastructure as Code and deployment configuration is standardized across environments.',
    ],
    flow: [
      { label: 'Code', icon: 'FileCode2' },
      { label: 'Git', icon: 'GitBranch' },
      { label: 'Build', icon: 'Hammer' },
      { label: 'Test', icon: 'CheckCircle2' },
      { label: 'Security Scan', icon: 'ShieldCheck' },
      { label: 'Container', icon: 'Container' },
      { label: 'Deployment', icon: 'UploadCloud' },
      { label: 'Verification', icon: 'Activity' },
    ],
    focusAreas: [
      'Source-controlled pipeline definitions',
      'Automated build and test stages',
      'Security scanning before deployment',
      'Container image standardization',
      'Infrastructure as Code for target environments',
      'Automated, auditable deployment steps',
    ],
    technologies: ['GitHub / GitLab', 'CI/CD', 'Docker', 'Terraform', 'Kubernetes', 'Linux'],
    considerations: [
      'Pipeline stages should fail fast — cheap checks (lint, unit tests) run before expensive ones (integration tests, security scans).',
      'Rollback needs to be a first-class pipeline action, not a manual recovery procedure improvised during an incident.',
      'Environment-specific configuration should be externalized so the same build artifact can move through every stage unchanged.',
      'Pipeline access and deployment approvals should follow the same least-privilege principles as production infrastructure.',
    ],
    outcome:
      'A more repeatable deployment process with clearer release workflows, reduced manual intervention and a stronger foundation for controlled application delivery.',
    benefits: [
      { title: 'Repeatable Releases', description: 'Every deployment follows the same automated path, reducing variability between releases.' },
      { title: 'Faster Recovery', description: 'A defined rollback path shortens the time needed to recover from a bad release.' },
      { title: 'Reduced Manual Effort', description: 'Automation replaces repetitive, error-prone deployment steps.' },
      { title: 'Clearer Release Visibility', description: 'Every stage of the pipeline is observable and auditable.' },
    ],
    relatedService: 'devops-solutions',
    ctaLabel: 'Explore DevOps Solutions',
    seo: {
      title: 'CI/CD Automation Case Study | Isha Technologies',
      description:
        'A representative engineering scenario on replacing manual deployments with a standardized CI/CD workflow — build, test, security scanning and automated deployment.',
    },
  },

  // 02 — Cloud Infrastructure
  {
    slug: 'cloud-infrastructure',
    number: '02',
    category: 'Cloud Infrastructure',
    displayCategory: 'Cloud Infrastructure',
    title: 'Designing a Scalable Cloud Infrastructure Foundation',
    visualSlug: 'cloud-solutions',
    summary:
      'A growing application has infrastructure spread across compute, networking and storage without a consistent architecture. This scenario explores designing a structured cloud foundation as workloads scale.',
    cardProblem: 'Inconsistent infrastructure becomes harder to manage as workloads grow.',
    cardApproach: 'Design around network segmentation, IAM, high availability and IaC.',
    cardSolution: 'Users → Load Balancer → Application Layer → Database/Storage → Monitoring.',
    intro:
      'A representative engineering scenario exploring how a structured cloud foundation is designed around networking, identity, resilience and Infrastructure as Code as an application scales.',
    problem: [
      'A growing application has infrastructure spread across compute, networking, storage and database services without a consistent architecture.',
      'As workloads grow, the environment becomes harder to manage and changes become increasingly difficult to control.',
    ],
    challenges: [
      'Inconsistent infrastructure',
      'Limited environment standardization',
      'Networking complexity',
      'Access management challenges',
      'Scaling concerns',
      'Backup and recovery gaps',
    ],
    approach: [
      'We begin with infrastructure discovery and architecture planning.',
      'The target environment is designed around network segmentation, identity and access management, high availability, monitoring, backup strategy and Infrastructure as Code.',
    ],
    flow: [
      { label: 'Users', icon: 'Users' },
      { label: 'Load Balancer', icon: 'Waypoints' },
      { label: 'Application Layer', icon: 'Layers' },
      { label: 'Database / Storage', icon: 'Database' },
      { label: 'Monitoring', icon: 'Activity' },
    ],
    focusAreas: [
      'VPC / VNet architecture',
      'Public and private networking',
      'Identity and access management',
      'Compute',
      'Storage',
      'Database architecture',
      'High availability',
      'Backup',
      'Monitoring',
      'Infrastructure as Code',
    ],
    technologies: ['AWS', 'Microsoft Azure', 'Google Cloud', 'Terraform', 'Linux', 'Cloud monitoring'],
    considerations: [
      'Network segmentation (public/private subnets, security groups) should be designed before workloads are placed, not retrofitted.',
      'Identity and access boundaries need to scale with the team, not just the infrastructure — least-privilege access degrades quietly over time without review.',
      'High availability targets should be explicit and matched to the actual cost of downtime, not assumed by default.',
      "Backup and recovery plans are only as good as their last successful restore test.",
    ],
    outcome: 'A structured cloud foundation that is easier to manage, secure, automate and scale.',
    benefits: [
      { title: 'Structured Environment', description: 'A consistent architecture across compute, networking, storage and data.' },
      { title: 'Stronger Access Control', description: 'IAM boundaries designed around least privilege.' },
      { title: 'Improved Resilience', description: 'High availability and backup strategy built into the foundation.' },
      { title: 'Repeatable Infrastructure', description: 'Environments defined as code and easier to reproduce.' },
    ],
    relatedService: 'cloud-solutions',
    ctaLabel: 'Explore Cloud Solutions',
    seo: {
      title: 'Cloud Infrastructure Case Study | Isha Technologies',
      description:
        'A representative engineering scenario on designing a scalable, secure cloud infrastructure foundation across networking, identity, compute and data.',
    },
  },

  // 03 — Kubernetes Platform
  {
    slug: 'kubernetes-platform',
    number: '03',
    category: 'Kubernetes',
    displayCategory: 'Kubernetes',
    title: 'Building a Production-Ready Kubernetes Platform',
    visualSlug: 'kubernetes',
    summary:
      'A team has adopted containers but Kubernetes operations grow difficult as workloads increase. This scenario explores designing a production-ready platform around isolation, automation and observability.',
    cardProblem: 'Cluster networking, scaling and security need stronger operational practice.',
    cardApproach: 'Design around workload isolation, automation, networking and observability.',
    cardSolution: 'Ingress → Services → Deployments → Pods → Nodes → Cluster → Cloud.',
    intro:
      'A representative engineering scenario exploring how a Kubernetes environment is structured for production — from ingress and workload isolation down to monitoring and autoscaling.',
    problem: [
      'A team has adopted containers but Kubernetes operations are becoming difficult as workloads increase.',
      'Cluster networking, ingress, resource management, deployments, monitoring and security all require stronger operational practices.',
    ],
    challenges: [
      'Cluster configuration',
      'Workload management',
      'Networking',
      'Ingress',
      'Resource limits',
      'Autoscaling',
      'Security',
      'Monitoring',
      'Logging',
    ],
    approach: [
      'We design the Kubernetes environment around workload isolation, resource management, deployment automation, networking, security and observability.',
    ],
    flow: [
      { label: 'Ingress', icon: 'Waypoints' },
      { label: 'Services', icon: 'Boxes' },
      { label: 'Deployments', icon: 'Layers' },
      { label: 'Pods', icon: 'Package' },
      { label: 'Nodes', icon: 'Server' },
      { label: 'Cluster', icon: 'Network' },
      { label: 'Cloud', icon: 'Cloud' },
    ],
    focusAreas: [
      'Kubernetes architecture',
      'Docker',
      'Helm',
      'Ingress',
      'RBAC',
      'Secrets',
      'Autoscaling',
      'Resource requests and limits',
      'Monitoring',
      'Logging',
      'CI/CD integration',
      'High availability',
    ],
    technologies: ['Kubernetes', 'Docker', 'Helm', 'Terraform', 'Prometheus', 'Grafana'],
    considerations: [
      'Resource requests and limits should be set deliberately — unset limits are a common cause of noisy-neighbor performance issues.',
      'RBAC and namespace isolation need to be designed before workloads multiply, not applied retroactively across a growing cluster.',
      'Autoscaling policies should be tuned against real workload behavior, not default thresholds.',
      'Cluster upgrades and node lifecycle management need a tested, repeatable process before they are needed under pressure.',
    ],
    outcome: 'A structured Kubernetes platform designed to make workloads easier to deploy, monitor, secure and operate.',
    benefits: [
      { title: 'Consistent Workload Management', description: 'Standardized deployment and configuration patterns across the cluster.' },
      { title: 'Improved Resource Efficiency', description: 'Requests, limits and autoscaling matched to real usage.' },
      { title: 'Stronger Cluster Security', description: 'RBAC, secrets management and network policy applied deliberately.' },
      { title: 'Better Operational Visibility', description: 'Monitoring and logging integrated into the platform.' },
    ],
    relatedService: 'kubernetes',
    ctaLabel: 'Explore Kubernetes Solutions',
    seo: {
      title: 'Kubernetes Platform Case Study | Isha Technologies',
      description:
        'A representative engineering scenario on building a production-ready Kubernetes platform — cluster architecture, networking, scaling, security and observability.',
    },
  },

  // 04 — Terraform Automation
  {
    slug: 'terraform-automation',
    number: '04',
    category: 'DevOps',
    displayCategory: 'Terraform & Automation',
    title: 'Modernizing Infrastructure Through Infrastructure as Code',
    visualSlug: 'terraform',
    summary:
      'Infrastructure changes are performed manually across multiple environments, causing configuration drift. This scenario explores converting infrastructure into version-controlled Terraform modules.',
    cardProblem: 'Manual provisioning causes configuration drift across environments.',
    cardApproach: 'Convert infrastructure into version-controlled, reviewable Terraform modules.',
    cardSolution: 'Git → Terraform → Plan → Review → Apply → Cloud Infrastructure.',
    intro:
      'A representative engineering scenario exploring how manually provisioned infrastructure is converted into repeatable, version-controlled Terraform modules.',
    problem: [
      'Infrastructure changes are performed manually across multiple environments.',
      'Configuration drift develops over time and reproducing environments becomes difficult.',
    ],
    challenges: [
      'Manual provisioning',
      'Configuration drift',
      'Inconsistent environments',
      'Difficult infrastructure changes',
      'Limited version control',
    ],
    approach: [
      'We convert infrastructure configuration into version-controlled Terraform modules.',
      'Changes are reviewed through Git workflows and infrastructure provisioning becomes repeatable.',
    ],
    flow: [
      { label: 'Git', icon: 'GitBranch' },
      { label: 'Terraform', icon: 'FileCode2' },
      { label: 'Plan', icon: 'Search' },
      { label: 'Review', icon: 'GitPullRequest' },
      { label: 'Apply', icon: 'CheckCircle2' },
      { label: 'Cloud Infrastructure', icon: 'Cloud' },
    ],
    focusAreas: [
      'Terraform modules',
      'Remote state',
      'Environment separation',
      'Reusable infrastructure',
      'Git-based workflows',
      'Infrastructure review',
      'CI/CD integration',
      'Configuration consistency',
    ],
    technologies: ['Terraform', 'Git', 'AWS', 'Azure', 'Google Cloud', 'CI/CD'],
    considerations: [
      'Remote state needs locking and access control — concurrent applies against the same state are a common source of drift and corruption.',
      'Modules should be scoped around reusable boundaries (networking, compute, data) rather than mirroring a single environment.',
      'Every change should go through plan and review before apply — including changes made under time pressure.',
      'Environment separation (dev, staging, production) should use separate state and, where possible, separate credentials.',
    ],
    outcome: 'Infrastructure becomes repeatable, reviewable and easier to maintain across environments.',
    benefits: [
      { title: 'Eliminated Configuration Drift', description: 'Environments stay aligned with their version-controlled definition.' },
      { title: 'Reviewable Infrastructure Changes', description: 'Every change goes through plan and review before apply.' },
      { title: 'Reusable Infrastructure', description: 'Shared modules reduce duplicated provisioning work.' },
      { title: 'Faster Environment Reproduction', description: 'New environments can be provisioned from the same source.' },
    ],
    relatedService: 'platform-solutions',
    ctaLabel: 'Explore Platform Solutions',
    seo: {
      title: 'Terraform Automation Case Study | Isha Technologies',
      description:
        'A representative engineering scenario on modernizing infrastructure through version-controlled, reviewable Terraform modules and Git-based workflows.',
    },
  },

  // 05 — Cloud Migration
  {
    slug: 'cloud-migration',
    number: '05',
    category: 'Cloud Migration',
    displayCategory: 'Cloud Migration',
    title: 'Planning a Structured Cloud Migration',
    visualSlug: 'cloud-migration',
    summary:
      'An organization wants to move existing workloads to the cloud but has limited visibility into dependencies and priorities. This scenario explores a structured, phased migration approach.',
    cardProblem: 'Limited visibility into dependencies makes migrating everything at once risky.',
    cardApproach: 'Follow a structured lifecycle: Assess → Plan → Design → Migrate → Validate → Optimize.',
    cardSolution: 'Existing Infrastructure → Discovery → Migration Architecture → Cloud → Validation.',
    intro:
      'A representative engineering scenario exploring how a structured migration lifecycle reduces risk when moving existing workloads to the cloud.',
    problem: [
      'An organization wants to move existing workloads to the cloud but has limited visibility into application dependencies, infrastructure requirements and migration priorities.',
      'Moving everything at once introduces unnecessary operational risk.',
    ],
    challenges: [
      'Application discovery',
      'Infrastructure dependency mapping',
      'Database dependencies',
      'Workload classification',
      'Migration sequencing',
      'Validation',
      'Post-migration optimization',
    ],
    approach: ['We follow a structured migration lifecycle: Assess → Plan → Design → Migrate → Validate → Optimize.'],
    flow: [
      { label: 'Existing Infrastructure', icon: 'Server' },
      { label: 'Discovery & Assessment', icon: 'Search' },
      { label: 'Migration Architecture', icon: 'ArrowRightLeft' },
      { label: 'Cloud Environment', icon: 'Cloud' },
      { label: 'Validation & Optimization', icon: 'Gauge' },
    ],
    focusAreas: [
      'Application discovery',
      'Dependency mapping',
      'Server migration',
      'Database migration',
      'Container migration',
      'Network architecture',
      'Security',
      'Validation',
      'Performance review',
      'Post-migration optimization',
    ],
    technologies: ['AWS', 'Azure', 'Google Cloud', 'Terraform', 'Linux', 'Containers'],
    considerations: [
      'Dependency mapping should happen before sequencing — migrating a component before what it depends on creates avoidable outages.',
      'Database migration typically carries the highest risk and benefits from a tested cutover and rollback plan.',
      'Workloads should be classified by migration complexity (rehost, replatform, refactor) rather than treated uniformly.',
      'Validation needs defined success criteria agreed before cutover, not judged informally afterward.',
    ],
    outcome:
      'A structured migration roadmap that reduces unnecessary complexity and provides a clear path toward a modern cloud environment.',
    benefits: [
      { title: 'Reduced Migration Risk', description: 'Dependency-aware sequencing avoids moving components out of order.' },
      { title: 'Clearer Prioritization', description: 'Workloads classified and migrated based on complexity and impact.' },
      { title: 'Validated Cutover', description: 'Defined criteria confirm behavior before workloads are considered migrated.' },
      { title: 'Post-Migration Improvement', description: 'The new environment is reviewed and optimized after cutover.' },
    ],
    relatedService: 'cloud-migration',
    ctaLabel: 'Explore Cloud Migration',
    seo: {
      title: 'Cloud Migration Case Study | Isha Technologies',
      description:
        'A representative engineering scenario on planning a structured, dependency-aware cloud migration from assessment through validation and optimization.',
    },
  },

  // 06 — Cloud Cost Optimization
  {
    slug: 'cloud-cost-optimization',
    number: '06',
    category: 'Cost Optimization',
    displayCategory: 'Cloud Cost Optimization',
    title: 'Improving Cloud Efficiency Through Infrastructure Optimization',
    visualSlug: 'cloud-cost-optimization',
    summary:
      'Cloud environments often accumulate oversized and idle resources over time. This scenario explores improving efficiency without compromising performance or reliability.',
    cardProblem: 'Over-provisioned and idle resources accumulate without visibility.',
    cardApproach: 'Analyze usage and architecture before making optimization recommendations.',
    cardSolution: 'Analyze → Identify → Optimize → Monitor.',
    intro:
      'A representative engineering scenario exploring how cloud infrastructure is analyzed and rightsized without compromising the workload requirements it supports.',
    problem: [
      'Cloud environments often accumulate oversized resources, idle infrastructure, inefficient storage and workloads that are not aligned with actual usage.',
      'Simply reducing resources can create performance and reliability problems.',
    ],
    challenges: [
      'Over-provisioned compute',
      'Idle resources',
      'Inefficient storage',
      'Underutilized services',
      'Kubernetes resource inefficiency',
      'Limited cost visibility',
    ],
    approach: [
      'We analyze infrastructure usage and architecture before making optimization recommendations.',
      'The goal is to improve efficiency without compromising workload requirements.',
    ],
    flow: [
      { label: 'Resources', icon: 'Server' },
      { label: 'Utilization Analysis', icon: 'Search' },
      { label: 'Rightsizing', icon: 'SlidersHorizontal' },
      { label: 'Optimization', icon: 'Gauge' },
      { label: 'Monitoring', icon: 'Activity' },
    ],
    focusAreas: [
      'Resource utilization',
      'Rightsizing',
      'Idle resource identification',
      'Storage optimization',
      'Compute optimization',
      'Autoscaling',
      'Kubernetes resource management',
      'Reserved capacity',
      'Savings Plans',
      'Architecture review',
    ],
    technologies: ['AWS', 'Microsoft Azure', 'Google Cloud', 'Kubernetes', 'Terraform', 'CloudWatch', 'Grafana'],
    considerations: [
      'Rightsizing decisions should be based on sustained utilization trends, not a single snapshot in time.',
      'Reserved capacity and savings commitments should follow confirmed, stable usage — not precede it.',
      'Kubernetes resource requests are a common source of hidden over-provisioning and deserve the same scrutiny as VM sizing.',
      'Cost changes should be validated against performance and reliability, not evaluated on spend alone.',
    ],
    outcome: 'A more efficient infrastructure architecture with better resource utilization and stronger cost visibility.',
    benefits: [
      { title: 'Reduced Idle Spend', description: 'Underused and idle resources identified and addressed.' },
      { title: 'Right-Sized Compute', description: 'Instance and cluster sizing aligned with actual usage.' },
      { title: 'Improved Cost Visibility', description: 'Utilization tracked on an ongoing basis, not a one-time review.' },
      { title: 'Preserved Reliability', description: 'Efficiency improvements evaluated against performance impact.' },
    ],
    relatedService: 'cloud-cost-optimization',
    ctaLabel: 'Explore Cloud Cost Optimization',
    seo: {
      title: 'Cloud Cost Optimization Case Study | Isha Technologies',
      description:
        'A representative engineering scenario on improving cloud efficiency through resource analysis, rightsizing and architecture review.',
    },
  },

  // 07 — DevSecOps
  {
    slug: 'devsecops',
    number: '07',
    category: 'Cloud Security',
    displayCategory: 'DevSecOps',
    title: 'Integrating Security Into the Delivery Lifecycle',
    visualSlug: 'devsecops',
    summary:
      'Security checks happening late in the development lifecycle make vulnerabilities harder to catch before deployment. This scenario explores integrating security controls into CI/CD.',
    cardProblem: 'Late-stage security checks make vulnerabilities harder to catch early.',
    cardApproach: 'Integrate security controls directly into the CI/CD lifecycle.',
    cardSolution: 'Code → Build → SAST → Dependency Scan → Container Scan → Deploy → Monitor.',
    intro:
      'A representative engineering scenario exploring how security controls are integrated directly into the delivery pipeline rather than applied as a final checkpoint.',
    problem: [
      'Security checks happen late in the development lifecycle, making vulnerabilities and configuration issues harder to identify before deployment.',
      'Development and operations teams need security controls that work alongside delivery workflows.',
    ],
    challenges: [
      'Dependency vulnerabilities',
      'Container vulnerabilities',
      'Secret exposure',
      'Excessive permissions',
      'Missing security gates',
      'Inconsistent security checks',
    ],
    approach: ['Security controls are integrated directly into the CI/CD lifecycle.'],
    flow: [
      { label: 'Code', icon: 'FileCode2' },
      { label: 'Build', icon: 'Hammer' },
      { label: 'SAST', icon: 'ShieldCheck' },
      { label: 'Dependency Scan', icon: 'PackageSearch' },
      { label: 'Container Scan', icon: 'Container' },
      { label: 'Test', icon: 'CheckCircle2' },
      { label: 'Deploy', icon: 'UploadCloud' },
      { label: 'Monitor', icon: 'Activity' },
    ],
    focusAreas: [
      'SAST',
      'DAST',
      'Dependency scanning',
      'Container scanning',
      'Secret detection',
      'IAM',
      'Pipeline security',
      'Security gates',
      'Vulnerability management',
    ],
    technologies: ['GitHub / GitLab', 'CI/CD', 'Docker', 'Container security tools', 'Cloud IAM', 'Kubernetes'],
    considerations: [
      'Security gates need clear, actionable failure criteria — noisy scanners that block on low-severity findings get bypassed under pressure.',
      'Secret detection should run on every commit, not only at build time, to catch exposure as early as possible.',
      'Least-privilege IAM for pipeline service accounts is as important as scanning the code the pipeline deploys.',
      'Vulnerability findings need an owner and a remediation SLA, not just a report that accumulates unreviewed.',
    ],
    outcome: 'Security becomes a continuous part of software delivery rather than a final deployment checkpoint.',
    benefits: [
      { title: 'Earlier Vulnerability Detection', description: 'Issues are caught in the pipeline, before deployment.' },
      { title: 'Reduced Exposure Window', description: 'Fewer vulnerable dependencies and exposed secrets reach production.' },
      { title: 'Consistent Security Checks', description: 'The same checks run automatically on every change.' },
      { title: 'Clearer Accountability', description: 'Findings are tied to a stage, a gate and an owner.' },
    ],
    relatedService: 'devsecops',
    ctaLabel: 'Explore DevSecOps',
    seo: {
      title: 'DevSecOps Case Study | Isha Technologies',
      description:
        'A representative engineering scenario on integrating SAST, dependency scanning, container scanning and security gates into the CI/CD lifecycle.',
    },
  },

  // 08 — Observability
  {
    slug: 'observability',
    number: '08',
    category: 'Observability',
    displayCategory: 'Observability',
    title: 'Building Infrastructure Visibility With Observability',
    visualSlug: 'observability',
    summary:
      'When production issues occur, teams often have limited visibility into what happened across applications and infrastructure. This scenario explores building a correlated observability architecture.',
    cardProblem: 'Fragmented metrics, logs and alerts slow down incident investigation.',
    cardApproach: 'Build an observability architecture around correlated signals and alerting.',
    cardSolution: 'Metrics + Logs + Traces → Correlation → Visibility → Alerts → Response.',
    intro:
      'A representative engineering scenario exploring how metrics, logs and traces are brought together into a correlated view that supports faster incident investigation.',
    problem: [
      'When production issues occur, teams have limited visibility into what happened across applications, infrastructure and supporting services.',
      'Without correlated metrics, logs and traces, incident investigation becomes slower and more difficult.',
    ],
    challenges: [
      'Limited infrastructure visibility',
      'Noisy alerts',
      'Missing metrics',
      'Fragmented logs',
      'Difficult incident investigation',
      'Limited performance visibility',
    ],
    approach: ['We build an observability architecture around metrics, logs, traces, dashboards and actionable alerting.'],
    flow: [
      { label: 'Metrics', icon: 'LineChart' },
      { label: 'Logs', icon: 'FileText' },
      { label: 'Traces', icon: 'Waypoints' },
      { label: 'Correlation', icon: 'GitMerge' },
      { label: 'Operational Visibility', icon: 'Activity' },
      { label: 'Alerts', icon: 'BellRing' },
      { label: 'Incident Response', icon: 'AlertTriangle' },
    ],
    focusAreas: [
      'Metrics',
      'Logs',
      'Traces',
      'Dashboards',
      'Alerting',
      'Infrastructure monitoring',
      'Performance analysis',
      'Incident visibility',
    ],
    technologies: ['Prometheus', 'Grafana', 'CloudWatch', 'Kubernetes', 'Linux'],
    considerations: [
      'Alerts should be tied to user-facing symptoms first — infrastructure-level noise that never affects users erodes trust in the alerting system.',
      'Correlating metrics, logs and traces by a shared identifier (request ID, trace ID) is what actually shortens investigation time.',
      'Dashboards need an intended audience — an on-call dashboard and a capacity-planning dashboard answer different questions.',
      'Retention and cost trade-offs for logs and traces should be decided deliberately, not left to default settings.',
    ],
    outcome: 'Better operational visibility and a stronger foundation for investigating performance and infrastructure issues.',
    benefits: [
      { title: 'Faster Incident Investigation', description: 'Correlated signals reduce time spent tracing a problem across systems.' },
      { title: 'Actionable Alerting', description: 'Alerts tied to meaningful, user-facing conditions.' },
      { title: 'Shared Operational Context', description: 'Metrics, logs and traces viewed together, not in isolation.' },
      { title: 'Clearer Performance Trends', description: 'Historical signals support both investigation and planning.' },
    ],
    relatedService: 'observability',
    ctaLabel: 'Explore Observability',
    seo: {
      title: 'Observability Case Study | Isha Technologies',
      description:
        'A representative engineering scenario on building correlated observability across metrics, logs, traces, dashboards and alerting.',
    },
  },

  // 09 — Site Reliability
  {
    slug: 'site-reliability',
    number: '09',
    category: 'Reliability',
    displayCategory: 'Site Reliability',
    title: 'Designing a More Reliable Production Environment',
    visualSlug: 'site-reliability',
    summary:
      'Production systems may work under normal conditions but lack clear reliability practices for spikes, failures and incidents. This scenario explores designing reliability into the platform.',
    cardProblem: 'Reliability practices are missing for traffic spikes, failures and incidents.',
    cardApproach: 'Review architecture, dependencies and failure modes before defining SLOs.',
    cardSolution: 'Traffic → Load Balancer → Application → Database → Monitoring → Response.',
    intro:
      'A representative engineering scenario exploring how reliability practices — SLOs, capacity planning and incident response — are designed into a production platform.',
    problem: [
      'Production systems may work under normal conditions but lack clear reliability practices for traffic spikes, component failures, capacity constraints and operational incidents.',
      'The goal is to design reliability into the platform rather than responding only after failures occur.',
    ],
    challenges: [
      'Availability concerns',
      'Capacity planning',
      'Failure scenarios',
      'Backup and recovery',
      'Incident response',
      'Missing reliability targets',
      'Limited operational visibility',
    ],
    approach: [
      'We review architecture, dependencies, failure modes and operational processes.',
      'Reliability practices are then incorporated into the platform design.',
    ],
    flow: [
      { label: 'Traffic', icon: 'Waypoints' },
      { label: 'Load Balancer', icon: 'Network' },
      { label: 'Application', icon: 'Layers' },
      { label: 'Database', icon: 'Database' },
      { label: 'Monitoring & Alerts', icon: 'BellRing' },
      { label: 'Incident Response', icon: 'AlertTriangle' },
    ],
    focusAreas: [
      'Availability',
      'SLI',
      'SLO',
      'Error budgets',
      'Capacity planning',
      'Resilience',
      'Disaster recovery',
      'Monitoring',
      'Incident response',
      'Performance',
    ],
    technologies: ['Kubernetes', 'Prometheus', 'Grafana', 'CloudWatch', 'Terraform'],
    considerations: [
      'SLOs should be defined around what users actually experience, not around infrastructure metrics that are easy to measure.',
      'Error budgets only work as a decision tool if the team agrees in advance what happens when one is exhausted.',
      'Failure scenarios (dependency outage, zone failure, traffic spike) are worth testing deliberately rather than discovering during a real incident.',
      'Capacity planning should track growth trends, not just current headroom.',
    ],
    outcome: 'A production architecture designed with reliability, operational readiness and failure recovery in mind.',
    benefits: [
      { title: 'Defined Reliability Targets', description: 'SLIs and SLOs give the team a shared definition of "reliable enough."' },
      { title: 'Tested Failure Handling', description: 'Failure scenarios are reviewed and addressed before they occur in production.' },
      { title: 'Faster Incident Response', description: 'Clear ownership and escalation paths reduce response time.' },
      { title: 'Informed Capacity Planning', description: 'Growth trends inform scaling decisions ahead of demand.' },
    ],
    relatedService: 'site-reliability',
    ctaLabel: 'Explore Site Reliability',
    seo: {
      title: 'Site Reliability Case Study | Isha Technologies',
      description:
        'A representative engineering scenario on designing production reliability through SLOs, capacity planning, resilience and incident response.',
    },
  },
];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((study) => study.slug === slug);
}

export function getAdjacentCaseStudies(study: CaseStudy): {
  previous: CaseStudy | null;
  next: CaseStudy | null;
} {
  const index = caseStudies.findIndex((s) => s.slug === study.slug);
  return {
    previous: index > 0 ? caseStudies[index - 1] : null,
    next: index < caseStudies.length - 1 ? caseStudies[index + 1] : null,
  };
}

/** Builds a complete, unique Next.js Metadata object for a case study detail page. */
export function buildCaseStudyMetadata(study: CaseStudy): Metadata {
  const path = `/case-studies/${study.slug}`;
  return {
    title: study.seo.title,
    description: study.seo.description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      url: path,
      siteName: 'Isha Technologies',
      title: study.seo.title,
      description: study.seo.description,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: study.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: study.seo.title,
      description: study.seo.description,
      images: ['/og-image.png'],
    },
  };
}
