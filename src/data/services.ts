import type { Metadata } from 'next';
import type { Service } from '@/types/types';

export const services: Service[] = [
  // 01 — Cloud Solutions
  {
    slug: 'cloud-solutions',
    title: 'Cloud Solutions',
    eyebrow: 'CLOUD INFRASTRUCTURE',
    heading: 'Cloud Infrastructure Designed for Scale and Control',
    description:
      'We design secure, scalable cloud environments across AWS, Microsoft Azure and Google Cloud — aligned with your applications, workloads and operational requirements.',
    overview: {
      heading: 'Infrastructure Designed Around Your Platform',
      paragraphs: [
        'Cloud infrastructure should support growth without becoming difficult to operate.',
        'Isha Technologies helps design and implement cloud foundations covering architecture, networking, identity, compute, storage, resilience and operational visibility.',
      ],
    },
    capabilities: [
      {
        title: 'Cloud Architecture',
        description:
          'Design cloud environments around application requirements, workload characteristics and future growth.',
        icon: 'Network',
      },
      {
        title: 'Cloud Infrastructure',
        description:
          'Build structured environments for compute, storage, networking and application workloads.',
        icon: 'Server',
      },
      {
        title: 'Cloud Networking',
        description:
          'Design VPC/VNet architecture, routing, connectivity, segmentation and secure network boundaries.',
        icon: 'Waypoints',
      },
      {
        title: 'Identity & Access',
        description:
          'Implement practical IAM structures, least-privilege access and environment separation.',
        icon: 'KeyRound',
      },
      {
        title: 'High Availability',
        description:
          'Design resilient architectures with appropriate redundancy and failure considerations.',
        icon: 'Activity',
      },
      {
        title: 'Disaster Recovery',
        description:
          'Plan backup, recovery and disaster recovery strategies around business requirements.',
        icon: 'LifeBuoy',
      },
    ],
    technologies: [
      { group: 'Cloud', items: ['AWS', 'Microsoft Azure', 'Google Cloud'] },
      { group: 'Automation', items: ['Terraform', 'Ansible'] },
      { group: 'Platform', items: ['Linux', 'Docker', 'Kubernetes'] },
    ],
    process: [
      { title: 'Assess', description: 'Review workloads, requirements and constraints.' },
      { title: 'Architect', description: 'Design the target cloud architecture.' },
      { title: 'Implement', description: 'Build infrastructure as code.' },
      { title: 'Secure', description: 'Apply access control and hardening.' },
      { title: 'Validate', description: 'Verify resilience and behavior.' },
      { title: 'Improve', description: 'Refine as workloads evolve.' },
    ],
    architecture: [
      { label: 'Users', icon: 'Users' },
      { label: 'Load Balancer', icon: 'Waypoints' },
      { label: 'Application', icon: 'Layers' },
      { label: 'Services', icon: 'Boxes' },
      { label: 'Database', icon: 'Database' },
      { label: 'Monitoring', icon: 'Activity' },
    ],
    businessValue: [
      { title: 'Scalable Infrastructure', description: 'Environments designed to grow with your workloads.' },
      { title: 'Consistent Environments', description: 'Infrastructure defined as code and repeatable.' },
      {
        title: 'Stronger Security Foundations',
        description: 'Access control and segmentation built in from the start.',
      },
      { title: 'Improved Operational Control', description: 'Clearer visibility into how infrastructure behaves.' },
    ],
    cta: { heading: "Let's Design Your Cloud Foundation." },
    relatedServices: ['aws', 'devops-solutions', 'cloud-migration'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Hetzner', 'DigitalOcean', 'BigRock'],
    seo: {
      title: 'Cloud Infrastructure Solutions | Isha Technologies',
      description:
        'Cloud architecture and infrastructure solutions across AWS, Microsoft Azure and Google Cloud, designed for secure, reliable and scalable environments.',
    },
  },

  // 02 — DevOps Solutions
  {
    slug: 'devops-solutions',
    title: 'DevOps Solutions',
    eyebrow: 'DELIVERY AUTOMATION',
    heading: 'Automate the Path from Code to Production',
    description:
      'We build repeatable delivery workflows that connect source control, testing, infrastructure, security and deployment into a reliable engineering process.',
    overview: {
      heading: 'Delivery Built on Repeatable Engineering Practice',
      paragraphs: [
        'Modern delivery depends on more than a CI pipeline.',
        'We help teams standardize environments, automate infrastructure and create deployment workflows that are easier to maintain and operate.',
      ],
    },
    capabilities: [
      {
        title: 'CI/CD Automation',
        description: 'Design pipelines for build, test, security checks and deployment.',
        icon: 'GitBranch',
      },
      {
        title: 'Infrastructure as Code',
        description: 'Manage infrastructure through repeatable and version-controlled Terraform workflows.',
        icon: 'FileCode2',
      },
      {
        title: 'Deployment Automation',
        description: 'Reduce manual release processes through automated and consistent deployments.',
        icon: 'UploadCloud',
      },
      {
        title: 'Environment Standardization',
        description: 'Create consistent development, staging and production environments.',
        icon: 'Layers',
      },
      {
        title: 'GitOps Workflows',
        description: 'Use version-controlled workflows for infrastructure and application delivery where appropriate.',
        icon: 'GitPullRequest',
      },
      {
        title: 'Pipeline Security',
        description: 'Integrate security checks and controlled access into delivery workflows.',
        icon: 'ShieldCheck',
      },
    ],
    technologies: [
      { group: 'Source & CI/CD', items: ['Git', 'GitHub Actions', 'GitLab CI/CD', 'Jenkins'] },
      { group: 'Automation', items: ['Terraform', 'Ansible'] },
      { group: 'Containers', items: ['Docker', 'Kubernetes', 'Helm'] },
    ],
    process: [
      { title: 'Assess', description: 'Review the current delivery workflow.' },
      { title: 'Standardize', description: 'Align environments and practices.' },
      { title: 'Automate', description: 'Build CI/CD and IaC pipelines.' },
      { title: 'Secure', description: 'Add checks and controlled gates.' },
      { title: 'Deploy', description: 'Ship through repeatable pipelines.' },
      { title: 'Improve', description: 'Refine based on delivery feedback.' },
    ],
    architecture: [
      { label: 'Code', icon: 'FileCode2' },
      { label: 'Git', icon: 'GitBranch' },
      { label: 'CI/CD', icon: 'Workflow' },
      { label: 'Test', icon: 'CheckCircle2' },
      { label: 'Security', icon: 'ShieldCheck' },
      { label: 'Container', icon: 'Container' },
      { label: 'Deploy', icon: 'UploadCloud' },
      { label: 'Monitor', icon: 'Activity' },
    ],
    businessValue: [
      { title: 'Faster, More Consistent Releases', description: 'Standardized pipelines reduce release variability.' },
      { title: 'Reduced Manual Work', description: 'Automation replaces repetitive deployment steps.' },
      { title: 'Repeatable Environments', description: 'Development, staging and production stay aligned.' },
      { title: 'Improved Deployment Control', description: 'Clear gates and checks throughout delivery.' },
    ],
    cta: { heading: "Let's Improve Your Delivery Pipeline." },
    relatedServices: ['cloud-solutions', 'terraform', 'platform-solutions'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Hetzner', 'DigitalOcean'],
    seo: {
      title: 'DevOps Solutions | Isha Technologies',
      description:
        'CI/CD automation, Infrastructure as Code and GitOps workflows that connect source control, testing and deployment into a reliable delivery process.',
    },
  },

  // 03 — Kubernetes
  {
    slug: 'kubernetes',
    title: 'Kubernetes',
    eyebrow: 'CONTAINER PLATFORM ENGINEERING',
    heading: 'Kubernetes Platforms Built for Production Workloads',
    description:
      'We design, deploy and improve Kubernetes environments with focus on reliability, security, scalability, networking and operational visibility.',
    overview: {
      heading: 'Operational Discipline Behind Every Cluster',
      paragraphs: [
        'Kubernetes provides powerful orchestration, but production environments require thoughtful architecture and operational discipline.',
        'We help teams build Kubernetes platforms that are easier to deploy, monitor, secure and maintain.',
      ],
    },
    capabilities: [
      {
        title: 'Cluster Architecture',
        description: 'Design production-ready cluster structures and workload organization.',
        icon: 'Boxes',
      },
      {
        title: 'Kubernetes Deployment',
        description: 'Set up and configure Kubernetes environments for application workloads.',
        icon: 'Ship',
      },
      {
        title: 'Networking & Ingress',
        description: 'Configure services, ingress, networking and traffic routing.',
        icon: 'Waypoints',
      },
      {
        title: 'Scaling & Reliability',
        description: 'Implement autoscaling, health checks and resilience patterns.',
        icon: 'Activity',
      },
      {
        title: 'Helm & Deployment Management',
        description: 'Standardize application deployment using Helm and repeatable workflows.',
        icon: 'Package',
      },
      {
        title: 'Monitoring & Logging',
        description: 'Integrate monitoring, metrics, logs and operational visibility.',
        icon: 'LineChart',
      },
    ],
    technologies: [
      { group: 'Containers', items: ['Kubernetes', 'Docker', 'Helm'] },
      { group: 'Automation', items: ['Terraform'] },
      { group: 'Observability', items: ['Prometheus', 'Grafana', 'CloudWatch'] },
      { group: 'Platform', items: ['Linux'] },
    ],
    process: [
      { title: 'Assess', description: 'Review workloads and platform needs.' },
      { title: 'Design', description: 'Plan cluster and workload architecture.' },
      { title: 'Deploy', description: 'Stand up clusters and workloads.' },
      { title: 'Secure', description: 'Apply network and access controls.' },
      { title: 'Observe', description: 'Add monitoring and logging.' },
      { title: 'Optimize', description: 'Tune scaling and resource usage.' },
    ],
    architecture: [
      { label: 'Ingress', icon: 'Waypoints' },
      { label: 'Services', icon: 'Boxes' },
      { label: 'Deployments', icon: 'Layers' },
      { label: 'Pods', icon: 'Package' },
      { label: 'Nodes', icon: 'Server' },
      { label: 'Cluster', icon: 'Network' },
      { label: 'Cloud', icon: 'Cloud' },
    ],
    businessValue: [
      { title: 'Consistent Container Orchestration', description: 'Standardized cluster and workload patterns.' },
      { title: 'Improved Workload Scalability', description: 'Autoscaling matched to real demand.' },
      { title: 'Better Operational Visibility', description: 'Monitoring and logging built into the platform.' },
      { title: 'Repeatable Deployments', description: 'Helm-based workflows reduce deployment drift.' },
    ],
    cta: { heading: "Let's Build a Kubernetes Platform for Production." },
    relatedServices: ['devops-solutions', 'platform-solutions', 'observability'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Hetzner'],
    seo: {
      title: 'Kubernetes Solutions | Isha Technologies',
      description:
        'Kubernetes platform engineering — cluster architecture, networking, scaling, Helm-based deployment and operational visibility for production workloads.',
    },
  },

  // 04 — Cloud Migration
  {
    slug: 'cloud-migration',
    title: 'Cloud Migration',
    eyebrow: 'CLOUD TRANSFORMATION',
    heading: 'Move to the Cloud with a Structured Migration Strategy',
    description:
      'We help teams assess existing infrastructure, plan migration paths and move workloads to cloud environments with a structured, validation-driven approach.',
    overview: {
      heading: 'Migration Planned Around Real Dependencies',
      paragraphs: [
        'Cloud migration is not simply moving servers.',
        'Successful migration requires understanding applications, dependencies, infrastructure, data and operational requirements before workloads are moved.',
      ],
    },
    capabilities: [
      {
        title: 'Infrastructure Assessment',
        description: 'Review current environments, workloads and dependencies.',
        icon: 'ClipboardList',
      },
      {
        title: 'Application Discovery',
        description: 'Map applications, services, databases and infrastructure relationships.',
        icon: 'Search',
      },
      {
        title: 'Migration Planning',
        description: 'Create a phased migration strategy based on workload requirements.',
        icon: 'Map',
      },
      {
        title: 'Workload Migration',
        description: 'Support server, database, container, application and infrastructure migrations.',
        icon: 'ArrowRightLeft',
      },
      {
        title: 'Cloud Architecture',
        description: 'Design the target cloud environment and supporting infrastructure.',
        icon: 'Network',
      },
      {
        title: 'Post-Migration Optimization',
        description: 'Review the new environment for reliability, security, performance and operational improvements.',
        icon: 'Gauge',
      },
    ],
    technologies: [
      { group: 'Cloud', items: ['AWS', 'Microsoft Azure', 'Google Cloud'] },
      { group: 'Automation', items: ['Terraform', 'Ansible'] },
      { group: 'Platform', items: ['Docker', 'Kubernetes', 'Linux'] },
    ],
    process: [
      { title: 'Assess', description: 'Review existing infrastructure and workloads.' },
      { title: 'Plan', description: 'Map dependencies and migration order.' },
      { title: 'Design', description: 'Design the target cloud architecture.' },
      { title: 'Migrate', description: 'Move workloads in planned phases.' },
      { title: 'Validate', description: 'Confirm behavior in the new environment.' },
      { title: 'Optimize', description: 'Improve the environment post-migration.' },
    ],
    architecture: [
      { label: 'Existing Infrastructure', icon: 'Server' },
      { label: 'Discovery', icon: 'Search' },
      { label: 'Migration', icon: 'ArrowRightLeft' },
      { label: 'Cloud', icon: 'Cloud' },
      { label: 'Validation', icon: 'CheckCircle2' },
      { label: 'Optimization', icon: 'Gauge' },
    ],
    businessValue: [
      { title: 'Structured Migration Planning', description: 'A phased approach based on real dependencies.' },
      { title: 'Reduced Migration Uncertainty', description: 'Application discovery informs the migration path.' },
      { title: 'Better Target Architecture', description: 'Cloud environments designed, not just replicated.' },
      {
        title: 'Post-Migration Operational Readiness',
        description: 'Reliability, security and performance reviewed after cutover.',
      },
    ],
    cta: { heading: "Let's Plan Your Cloud Migration." },
    relatedServices: ['cloud-solutions', 'managed-cloud', 'cloud-cost-optimization'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Hetzner', 'DigitalOcean', 'BigRock'],
    seo: {
      title: 'Cloud Migration Services | Isha Technologies',
      description:
        'Structured cloud migration services — infrastructure assessment, application discovery, migration planning and post-migration optimization.',
    },
  },

  // 05 — Managed Cloud
  {
    slug: 'managed-cloud',
    title: 'Managed Cloud',
    eyebrow: 'CLOUD OPERATIONS',
    heading: 'Reliable Infrastructure Operations Without the Operational Overhead',
    description:
      'We help teams maintain cloud infrastructure through monitoring, maintenance, operational support, backup oversight, security practices and continuous improvement.',
    overview: {
      heading: 'Day-to-Day Operations Without the Overhead',
      paragraphs: [
        'Running infrastructure well requires ongoing attention — monitoring, patching, backup oversight and steady operational discipline.',
        'We support these day-to-day operational responsibilities so your team can focus on building, while infrastructure stays maintained and observed.',
      ],
    },
    capabilities: [
      {
        title: 'Infrastructure Monitoring',
        description: 'Monitor infrastructure health, performance and important operational signals.',
        icon: 'Activity',
      },
      {
        title: 'Cloud Operations',
        description: 'Support day-to-day infrastructure administration and operational tasks.',
        icon: 'Settings2',
      },
      {
        title: 'Maintenance & Patching',
        description: 'Keep systems maintained through structured update and patching practices.',
        icon: 'Wrench',
      },
      {
        title: 'Backup & Recovery',
        description: 'Monitor backup processes and support recovery readiness.',
        icon: 'Archive',
      },
      {
        title: 'Performance & Capacity',
        description: 'Review infrastructure performance and capacity requirements.',
        icon: 'Gauge',
      },
      {
        title: 'Security & Cost Review',
        description: 'Identify operational security and resource-efficiency improvements.',
        icon: 'ShieldCheck',
      },
    ],
    technologies: [
      { group: 'Cloud', items: ['AWS', 'Microsoft Azure', 'Google Cloud'] },
      { group: 'Automation', items: ['Terraform', 'Ansible'] },
      { group: 'Observability', items: ['Prometheus', 'Grafana', 'CloudWatch'] },
      { group: 'Security', items: ['IAM', 'Secrets Management'] },
    ],
    process: [
      { title: 'Assess', description: 'Review current infrastructure and operations.' },
      { title: 'Monitor', description: 'Establish ongoing operational visibility.' },
      { title: 'Maintain', description: 'Apply structured patching and upkeep.' },
      { title: 'Respond', description: 'Address issues as they are identified.' },
      { title: 'Improve', description: 'Refine operations over time.' },
    ],
    architecture: [
      { label: 'Infrastructure', icon: 'Server' },
      { label: 'Monitoring', icon: 'Activity' },
      { label: 'Alert', icon: 'BellRing' },
      { label: 'Response', icon: 'Zap' },
      { label: 'Maintenance', icon: 'Wrench' },
      { label: 'Optimization', icon: 'Gauge' },
    ],
    businessValue: [
      { title: 'Reduced Operational Load', description: 'Offload day-to-day infrastructure administration.' },
      { title: 'Consistent Maintenance', description: 'Structured patching and update practices.' },
      { title: 'Improved Visibility', description: 'Ongoing monitoring of infrastructure health.' },
      { title: 'Better Preparedness', description: 'Backup and recovery readiness kept current.' },
    ],
    cta: { heading: "Let's Simplify Your Infrastructure Operations." },
    relatedServices: ['site-reliability', 'observability', 'cloud-cost-optimization'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Hetzner', 'DigitalOcean', 'BigRock'],
    seo: {
      title: 'Managed Cloud Infrastructure | Isha Technologies',
      description:
        'Managed cloud operations — infrastructure monitoring, maintenance and patching, backup oversight and ongoing performance and security review.',
    },
  },

  // 06 — Cloud Cost Optimization
  {
    slug: 'cloud-cost-optimization',
    title: 'Cloud Cost Optimization',
    eyebrow: 'CLOUD EFFICIENCY',
    heading: 'Improve Cloud Efficiency Without Compromising Performance',
    description:
      'We analyze cloud usage, infrastructure architecture and resource allocation to identify practical opportunities for improving efficiency and controlling unnecessary spend.',
    overview: {
      heading: 'Efficiency Without Compromising Reliability',
      paragraphs: [
        'Cloud optimization is not simply about cutting costs.',
        'We look at utilization, architecture, workload patterns and resource allocation to improve efficiency while maintaining the performance and reliability your applications require.',
      ],
    },
    capabilities: [
      {
        title: 'Resource Utilization',
        description: 'Identify underused and over-provisioned infrastructure.',
        icon: 'PieChart',
      },
      {
        title: 'Rightsizing',
        description: 'Align compute and infrastructure resources with actual workload requirements.',
        icon: 'SlidersHorizontal',
      },
      {
        title: 'Storage Optimization',
        description: 'Review storage usage, retention and lifecycle strategies.',
        icon: 'HardDrive',
      },
      {
        title: 'Kubernetes Efficiency',
        description: 'Review cluster resources and workload allocation where applicable.',
        icon: 'Boxes',
      },
      {
        title: 'Architecture Review',
        description: 'Identify architectural patterns that create unnecessary infrastructure overhead.',
        icon: 'Network',
      },
      {
        title: 'Reserved Capacity & Savings Options',
        description: 'Evaluate appropriate purchasing models based on actual workload requirements.',
        icon: 'PiggyBank',
      },
    ],
    technologies: [
      { group: 'Cloud', items: ['AWS', 'Microsoft Azure', 'Google Cloud'] },
      { group: 'Platform', items: ['Kubernetes', 'Terraform'] },
      { group: 'Observability', items: ['CloudWatch', 'Grafana'] },
    ],
    process: [
      { title: 'Analyze', description: 'Review usage and spend patterns.' },
      { title: 'Identify', description: 'Find inefficiencies and overhead.' },
      { title: 'Optimize', description: 'Rightsize and restructure resources.' },
      { title: 'Monitor', description: 'Track efficiency on an ongoing basis.' },
    ],
    architecture: [
      { label: 'Usage', icon: 'PieChart' },
      { label: 'Analysis', icon: 'Search' },
      { label: 'Rightsizing', icon: 'SlidersHorizontal' },
      { label: 'Optimization', icon: 'Gauge' },
      { label: 'Monitoring', icon: 'Activity' },
    ],
    businessValue: [
      { title: 'Reduced Waste', description: 'Identify underused and over-provisioned resources.' },
      { title: 'Right-Sized Infrastructure', description: 'Align resources with actual workload needs.' },
      { title: 'Sustained Efficiency', description: 'Ongoing monitoring keeps spend aligned with usage.' },
      { title: 'Preserved Performance', description: 'Efficiency improvements without compromising reliability.' },
    ],
    cta: { heading: "Let's Improve Your Cloud Efficiency." },
    relatedServices: ['aws', 'managed-cloud', 'kubernetes'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure'],
    seo: {
      title: 'Cloud Cost Optimization | Isha Technologies',
      description:
        'Practical cloud cost optimization — resource utilization review, rightsizing, storage optimization and architecture review without compromising performance.',
    },
  },

  // 07 — DevSecOps
  {
    slug: 'devsecops',
    title: 'DevSecOps',
    eyebrow: 'SECURE DELIVERY',
    heading: 'Security Integrated Into the Delivery Lifecycle',
    description:
      'We integrate practical security controls into infrastructure and delivery workflows so security becomes part of the engineering process rather than a final checkpoint.',
    overview: {
      heading: 'Security as Part of the Engineering Process',
      paragraphs: [
        'Security controls added at the end of a delivery pipeline tend to slow teams down and get bypassed under pressure.',
        'We integrate practical checks — static analysis, dependency and container scanning, and access controls — directly into existing development and delivery workflows.',
      ],
    },
    capabilities: [
      {
        title: 'Source Code Security',
        description: 'Integrate static analysis and security checks into development workflows.',
        icon: 'FileCode2',
      },
      {
        title: 'Dependency Security',
        description: 'Identify vulnerable third-party dependencies before deployment.',
        icon: 'PackageSearch',
      },
      {
        title: 'Container Security',
        description: 'Scan container images and improve image security practices.',
        icon: 'Container',
      },
      {
        title: 'Secret Detection',
        description: 'Identify exposed credentials and improve secret management workflows.',
        icon: 'KeyRound',
      },
      {
        title: 'IAM & Access Control',
        description: 'Apply practical access controls and least-privilege principles.',
        icon: 'Lock',
      },
      {
        title: 'CI/CD Security',
        description: 'Add security checks and controlled gates throughout delivery pipelines.',
        icon: 'ShieldCheck',
      },
    ],
    technologies: [
      { group: 'Source & CI/CD', items: ['Git', 'CI/CD'] },
      { group: 'Automation', items: ['Terraform'] },
      { group: 'Containers', items: ['Docker', 'Kubernetes'] },
      { group: 'Security', items: ['IAM', 'Secrets Management', 'SAST', 'DAST', 'Container Scanning'] },
    ],
    process: [
      { title: 'Identify', description: 'Review current exposure and gaps.' },
      { title: 'Integrate', description: 'Add checks into existing workflows.' },
      { title: 'Automate', description: 'Run checks automatically in pipelines.' },
      { title: 'Validate', description: 'Confirm findings are addressed.' },
      { title: 'Improve', description: 'Refine controls over time.' },
    ],
    architecture: [
      { label: 'Code', icon: 'FileCode2' },
      { label: 'Build', icon: 'Hammer' },
      { label: 'SAST', icon: 'ShieldCheck' },
      { label: 'Dependency Scan', icon: 'PackageSearch' },
      { label: 'Container Scan', icon: 'Container' },
      { label: 'Deploy', icon: 'UploadCloud' },
      { label: 'Monitor', icon: 'Activity' },
    ],
    businessValue: [
      { title: 'Earlier Issue Detection', description: 'Security checks run throughout the pipeline, not at the end.' },
      { title: 'Reduced Exposure', description: 'Fewer vulnerable dependencies and exposed secrets reach production.' },
      { title: 'Controlled Access', description: 'Least-privilege principles applied across delivery.' },
      { title: 'Consistent Security Practice', description: 'Security becomes part of the engineering workflow.' },
    ],
    cta: { heading: "Let's Strengthen Your Delivery Security." },
    relatedServices: ['devops-solutions', 'cloud-security', 'kubernetes'],
    seo: {
      title: 'DevSecOps Solutions | Isha Technologies',
      description:
        'DevSecOps services integrating static analysis, dependency and container scanning, secret detection and access control into delivery pipelines.',
    },
  },

  // 08 — Platform Solutions
  {
    slug: 'platform-solutions',
    title: 'Platform Solutions',
    eyebrow: 'PLATFORM ENGINEERING',
    heading: 'Build Internal Platforms That Make Infrastructure Easier to Operate',
    description:
      'We create reusable infrastructure patterns, self-service workflows and internal platforms that help engineering teams work with infrastructure more consistently.',
    overview: {
      heading: 'Reducing Friction Between Teams and Infrastructure',
      paragraphs: [
        'Engineering teams lose time when every project has to solve infrastructure problems from scratch.',
        'We build internal platforms, reusable modules and self-service workflows that give teams a consistent, supported way to provision and manage infrastructure.',
      ],
    },
    capabilities: [
      {
        title: 'Internal Developer Platforms',
        description: 'Create structured interfaces and workflows for common infrastructure tasks.',
        icon: 'LayoutGrid',
      },
      {
        title: 'Golden Paths',
        description: 'Define recommended, repeatable approaches for development and deployment.',
        icon: 'Route',
      },
      {
        title: 'Self-Service Infrastructure',
        description: 'Enable teams to provision approved infrastructure through reusable workflows.',
        icon: 'MousePointerClick',
      },
      {
        title: 'Reusable Infrastructure Modules',
        description: 'Create standardized Terraform and infrastructure modules.',
        icon: 'FileCode2',
      },
      {
        title: 'Environment Provisioning',
        description: 'Automate consistent environment creation and configuration.',
        icon: 'Server',
      },
      {
        title: 'Developer Experience',
        description: 'Reduce infrastructure friction without hiding important operational controls.',
        icon: 'Users',
      },
    ],
    technologies: [
      { group: 'Automation', items: ['Terraform', 'Ansible'] },
      { group: 'Containers', items: ['Docker', 'Kubernetes', 'Helm'] },
      { group: 'CI/CD', items: ['GitHub Actions', 'GitLab CI/CD'] },
    ],
    process: [
      { title: 'Discover', description: 'Understand current workflows and pain points.' },
      { title: 'Standardize', description: 'Define golden paths and patterns.' },
      { title: 'Build', description: 'Create reusable modules and templates.' },
      { title: 'Automate', description: 'Wire up self-service provisioning.' },
      { title: 'Enable', description: 'Roll the platform out to teams.' },
    ],
    architecture: [
      { label: 'Developer', icon: 'Users' },
      { label: 'Internal Platform', icon: 'LayoutGrid' },
      { label: 'Templates', icon: 'FileCode2' },
      { label: 'Infrastructure', icon: 'Server' },
      { label: 'Deployment', icon: 'UploadCloud' },
    ],
    businessValue: [
      { title: 'Less Infrastructure Friction', description: 'Common tasks become self-service.' },
      { title: 'Standardized Engineering Workflows', description: 'Golden paths guide common decisions.' },
      { title: 'Reusable Infrastructure', description: 'Shared modules reduce duplicated effort.' },
      { title: 'Better Developer Experience', description: 'Less time spent on infrastructure mechanics.' },
    ],
    cta: { heading: "Let's Build a Better Platform for Your Engineers." },
    relatedServices: ['devops-solutions', 'terraform', 'kubernetes'],
    seo: {
      title: 'Platform Engineering Solutions | Isha Technologies',
      description:
        'Internal developer platforms, golden paths and reusable infrastructure modules that make infrastructure easier for engineering teams to operate.',
    },
  },

  // 09 — Site Reliability
  {
    slug: 'site-reliability',
    title: 'Site Reliability',
    eyebrow: 'RELIABILITY ENGINEERING',
    heading: 'Reliability Designed Into Production Systems',
    description:
      'We help teams improve production reliability through measurable service objectives, observability, resilience planning and practical operational practices.',
    overview: {
      heading: 'Reliability as a Deliberate Engineering Practice',
      paragraphs: [
        'Reliable systems are the result of deliberate practice, not chance.',
        'We help teams define meaningful reliability objectives, build observability around them and put practical incident and capacity processes in place.',
      ],
    },
    capabilities: [
      {
        title: 'SLI & SLO Planning',
        description: 'Define meaningful reliability indicators and objectives.',
        icon: 'Target',
      },
      {
        title: 'Reliability Monitoring',
        description: 'Monitor important service and infrastructure signals.',
        icon: 'Activity',
      },
      {
        title: 'Incident Management',
        description: 'Create practical processes for detecting, responding to and learning from incidents.',
        icon: 'AlertTriangle',
      },
      {
        title: 'Capacity Planning',
        description: 'Understand infrastructure capacity and future workload requirements.',
        icon: 'Gauge',
      },
      {
        title: 'Disaster Recovery',
        description: 'Improve recovery planning and operational readiness.',
        icon: 'LifeBuoy',
      },
      {
        title: 'Performance Engineering',
        description: 'Identify performance bottlenecks and infrastructure constraints.',
        icon: 'Zap',
      },
    ],
    technologies: [
      { group: 'Observability', items: ['Prometheus', 'Grafana', 'CloudWatch'] },
      { group: 'Containers', items: ['Kubernetes'] },
      { group: 'Automation', items: ['Terraform'] },
    ],
    process: [
      { title: 'Assess', description: 'Review current reliability posture.' },
      { title: 'Measure', description: 'Define SLIs, SLOs and signals.' },
      { title: 'Improve', description: 'Address gaps in resilience.' },
      { title: 'Validate', description: 'Test failure handling and recovery.' },
      { title: 'Operate', description: 'Run with practical incident processes.' },
    ],
    architecture: [
      { label: 'Traffic', icon: 'Waypoints' },
      { label: 'Load Balancer', icon: 'Network' },
      { label: 'Application', icon: 'Layers' },
      { label: 'Database', icon: 'Database' },
      { label: 'Monitoring', icon: 'Activity' },
      { label: 'Incident Response', icon: 'AlertTriangle' },
    ],
    businessValue: [
      { title: 'Clearer Reliability Targets', description: 'Defined SLIs and SLOs guide priorities.' },
      { title: 'Faster Incident Response', description: 'Practical processes for detecting and responding to issues.' },
      { title: 'Better Capacity Foresight', description: 'Planning based on real workload growth.' },
      { title: 'Stronger Recovery Readiness', description: 'Disaster recovery planning kept current.' },
    ],
    cta: { heading: "Let's Build More Reliable Production Systems." },
    relatedServices: ['observability', 'cloud-security', 'managed-cloud'],
    seo: {
      title: 'Site Reliability Engineering | Isha Technologies',
      description:
        'Site reliability engineering — SLI/SLO planning, reliability monitoring, incident management, capacity planning and disaster recovery.',
    },
  },

  // 10 — Observability
  {
    slug: 'observability',
    title: 'Observability',
    eyebrow: 'OPERATIONAL VISIBILITY',
    heading: 'Turn Infrastructure Signals Into Operational Visibility',
    description:
      'We bring metrics, logs and traces together to help engineering teams understand system behavior, identify issues and respond with better operational context.',
    overview: {
      heading: 'Understanding System Behavior, Not Just Uptime',
      paragraphs: [
        'Metrics, logs and traces are only useful when they can be connected to what is actually happening in a system.',
        'We bring these signals together so engineering teams can investigate issues with real operational context, not isolated data points.',
      ],
    },
    capabilities: [
      {
        title: 'Metrics',
        description: 'Collect and organize infrastructure and application metrics.',
        icon: 'LineChart',
      },
      {
        title: 'Logs',
        description: 'Centralize and structure logs for operational investigation.',
        icon: 'FileText',
      },
      {
        title: 'Traces',
        description: 'Improve visibility into distributed application behavior.',
        icon: 'Waypoints',
      },
      {
        title: 'Monitoring',
        description: 'Track important infrastructure and service signals.',
        icon: 'Activity',
      },
      {
        title: 'Alerting',
        description: 'Create actionable alerts around meaningful operational conditions.',
        icon: 'BellRing',
      },
      {
        title: 'Incident Visibility',
        description: 'Connect system signals with operational response and investigation.',
        icon: 'Search',
      },
    ],
    technologies: [
      { group: 'Metrics & Dashboards', items: ['Prometheus', 'Grafana', 'CloudWatch'] },
      { group: 'Logs & Traces', items: ['Logging platforms', 'Tracing tools'] },
    ],
    process: [
      { title: 'Collect', description: 'Gather metrics, logs and traces.' },
      { title: 'Correlate', description: 'Connect signals across systems.' },
      { title: 'Visualize', description: 'Build clear operational views.' },
      { title: 'Alert', description: 'Define actionable alert conditions.' },
      { title: 'Investigate', description: 'Support faster root-cause analysis.' },
      { title: 'Improve', description: 'Refine signals over time.' },
    ],
    architecture: [
      { label: 'Metrics', icon: 'LineChart' },
      { label: 'Logs', icon: 'FileText' },
      { label: 'Traces', icon: 'Waypoints' },
      { label: 'Correlation', icon: 'GitMerge' },
      { label: 'Insights', icon: 'Lightbulb' },
      { label: 'Alerts', icon: 'BellRing' },
      { label: 'Response', icon: 'Zap' },
    ],
    businessValue: [
      { title: 'Faster Root Cause Analysis', description: 'Correlated metrics, logs and traces speed up investigation.' },
      { title: 'Actionable Alerting', description: 'Alerts tied to meaningful operational conditions.' },
      { title: 'Shared Operational Context', description: 'Teams work from the same system signals.' },
      { title: 'Improved System Understanding', description: 'Visibility into how distributed systems actually behave.' },
    ],
    cta: { heading: "Let's Make Your Infrastructure Easier to Understand." },
    relatedServices: ['site-reliability', 'kubernetes', 'managed-cloud'],
    seo: {
      title: 'Cloud Infrastructure Observability | Isha Technologies',
      description:
        'Observability services bringing metrics, logs and traces together for clearer system understanding, actionable alerting and faster investigation.',
    },
  },

  // 11 — AWS
  {
    slug: 'aws',
    title: 'AWS Cloud Services',
    eyebrow: 'AWS SPECIALIST SERVICES',
    heading: 'AWS Infrastructure Built on Deep Platform Expertise',
    description:
      'We design, automate and operate AWS environments — architecture, identity and access, compute and containers, cost efficiency and monitoring — using AWS-native services and current best practices.',
    overview: {
      heading: 'AWS Expertise Across the Full Stack',
      paragraphs: [
        'AWS has the largest service catalog of any cloud provider, but most production workloads are built from a well-understood core: VPC networking, IAM, compute (EC2, ECS or EKS), managed databases, and CloudWatch for visibility.',
        'We focus specifically on that AWS-native core — designing it correctly the first time, automating it as code, and keeping it secure, observable and cost-efficient as workloads grow.',
      ],
    },
    capabilities: [
      {
        title: 'AWS Architecture & Landing Zones',
        description: 'Design multi-account, multi-AZ AWS environments aligned to workload and compliance needs.',
        icon: 'Network',
      },
      {
        title: 'AWS IAM & Security',
        description: 'Implement least-privilege IAM roles, Service Control Policies and account guardrails.',
        icon: 'KeyRound',
      },
      {
        title: 'Compute & Containers',
        description: 'Run workloads on EC2, ECS or EKS, matched to the operational profile of each application.',
        icon: 'Server',
      },
      {
        title: 'AWS Networking',
        description: 'Design VPCs, subnets, routing and connectivity for secure, scalable AWS networks.',
        icon: 'Waypoints',
      },
      {
        title: 'AWS Cost Optimization',
        description: 'Rightsize instances, apply Savings Plans and eliminate idle AWS spend.',
        icon: 'Gauge',
      },
      {
        title: 'CloudWatch Monitoring',
        description: 'Set up metrics, alarms and dashboards using CloudWatch as the operational backbone.',
        icon: 'Activity',
      },
    ],
    technologies: [
      { group: 'Compute & Containers', items: ['EC2', 'ECS', 'EKS', 'Lambda'] },
      { group: 'Networking', items: ['VPC', 'Route 53', 'CloudFront', 'ELB'] },
      { group: 'Data', items: ['RDS', 'S3', 'DynamoDB'] },
      { group: 'Operations', items: ['IAM', 'CloudWatch', 'CloudTrail', 'Terraform'] },
    ],
    process: [
      { title: 'Assess', description: 'Review existing AWS usage, accounts and architecture.' },
      { title: 'Architect', description: 'Design the target AWS environment.' },
      { title: 'Implement', description: 'Build it as reviewable infrastructure as code.' },
      { title: 'Secure', description: 'Apply IAM, network and encryption controls.' },
      { title: 'Optimize', description: 'Rightsize and eliminate unnecessary AWS spend.' },
      { title: 'Monitor', description: 'Stand up CloudWatch-based operational visibility.' },
    ],
    architecture: [
      { label: 'Users', icon: 'Users' },
      { label: 'Route 53', icon: 'Waypoints' },
      { label: 'Load Balancer', icon: 'Network' },
      { label: 'EC2 / ECS / EKS', icon: 'Server' },
      { label: 'RDS', icon: 'Database' },
      { label: 'CloudWatch', icon: 'Activity' },
    ],
    businessValue: [
      { title: 'AWS-Native Reliability', description: 'Architectures built the way AWS is designed to be used.' },
      { title: 'Reduced AWS Spend', description: 'Rightsizing and commitment planning matched to real usage.' },
      { title: 'Faster AWS Delivery', description: 'Infrastructure as code speeds up repeatable AWS changes.' },
      { title: 'Stronger AWS Security', description: 'Least-privilege IAM and account-level guardrails.' },
    ],
    cta: { heading: "Let's Build on AWS the Right Way." },
    relatedServices: ['cloud-solutions', 'terraform', 'cloud-cost-optimization'],
    platforms: ['AWS'],
    seo: {
      title: 'AWS Cloud Services | Isha Technologies',
      description:
        'AWS consulting and managed services — architecture, IAM security, compute and containers, cost optimization and CloudWatch monitoring built on AWS best practices.',
    },
  },

  // 12 — Terraform & Infrastructure as Code
  {
    slug: 'terraform',
    title: 'Terraform & Infrastructure as Code',
    eyebrow: 'INFRASTRUCTURE AS CODE',
    heading: 'Infrastructure Defined, Reviewed and Versioned as Code',
    description:
      'We design and implement Terraform-based infrastructure as code — reusable modules, remote state management and CI/CD-integrated workflows that make infrastructure changes reviewable and repeatable.',
    overview: {
      heading: 'The Terraform Craft, Not Just the Tool',
      paragraphs: [
        'Writing Terraform that works is different from writing Terraform that stays maintainable as a team and its infrastructure grow — module design, state management and environment structure matter as much as the resource definitions themselves.',
        'We focus specifically on that craft: modules that encode real standards, remote state that is safe for a team to share, and a review process that makes every infrastructure change as visible as an application code change.',
      ],
    },
    capabilities: [
      {
        title: 'Terraform Module Design',
        description: 'Build reusable, parameterized modules that encode organizational standards once.',
        icon: 'FileCode2',
      },
      {
        title: 'Remote State Management',
        description: 'Set up safe, locked remote state for teams working on shared infrastructure.',
        icon: 'Database',
      },
      {
        title: 'Multi-Environment Structuring',
        description: 'Structure dev, staging and production with separate, non-conflicting state.',
        icon: 'Layers',
      },
      {
        title: 'Terraform CI/CD Integration',
        description: 'Run plan on every change and apply only after review and approval.',
        icon: 'GitBranch',
      },
      {
        title: 'Drift Detection',
        description: 'Catch infrastructure changed outside of Terraform before it causes an incident.',
        icon: 'Search',
      },
      {
        title: 'Migration to IaC',
        description: 'Bring existing, manually-managed infrastructure under Terraform safely.',
        icon: 'ArrowRightLeft',
      },
    ],
    technologies: [
      { group: 'IaC', items: ['Terraform', 'Terraform Cloud/Enterprise'] },
      { group: 'Providers', items: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Kubernetes'] },
      { group: 'CI/CD', items: ['GitHub Actions', 'GitLab CI/CD'] },
    ],
    process: [
      { title: 'Audit', description: 'Review existing infrastructure and any current IaC.' },
      { title: 'Design', description: 'Plan module structure and state layout.' },
      { title: 'Modularize', description: 'Build reusable, standards-encoding modules.' },
      { title: 'Automate', description: 'Wire plan/apply into CI/CD with review gates.' },
      { title: 'Review', description: 'Establish a pull-request-based change process.' },
      { title: 'Maintain', description: 'Monitor for drift and evolve modules over time.' },
    ],
    architecture: [
      { label: 'Code', icon: 'FileCode2' },
      { label: 'Pull Request', icon: 'GitBranch' },
      { label: 'Plan', icon: 'Search' },
      { label: 'Review', icon: 'CheckCircle2' },
      { label: 'Apply', icon: 'UploadCloud' },
      { label: 'State', icon: 'Database' },
    ],
    businessValue: [
      { title: 'Reviewable Infrastructure Changes', description: 'Every change is visible before it happens, not after.' },
      { title: 'Reduced Configuration Drift', description: 'Regular plan runs surface drift early.' },
      { title: 'Faster Environment Provisioning', description: 'New environments stood up from proven modules.' },
      { title: 'Consistent Environments', description: 'Dev, staging and production built from the same source.' },
    ],
    cta: { heading: "Let's Turn Your Infrastructure Into Code." },
    relatedServices: ['devops-solutions', 'platform-solutions', 'aws'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure'],
    seo: {
      title: 'Terraform & Infrastructure as Code Services | Isha Technologies',
      description:
        'Terraform consulting — reusable modules, remote state management, drift detection and CI/CD-integrated infrastructure as code workflows.',
    },
  },

  // 13 — Cloud Security
  {
    slug: 'cloud-security',
    title: 'Cloud Security',
    eyebrow: 'INFRASTRUCTURE & CLOUD SECURITY',
    heading: 'Security Built Into Your Cloud Infrastructure',
    description:
      'We assess and strengthen cloud security posture — identity and access management, network segmentation, encryption and audit visibility — across AWS, Microsoft Azure and Google Cloud environments.',
    overview: {
      heading: 'Infrastructure Security, Not Just Pipeline Security',
      paragraphs: [
        'Cloud security spans more than the delivery pipeline — it includes how identity is managed, how networks are segmented, how data is encrypted, and how audit trails are kept for investigation.',
        'We focus on that infrastructure layer specifically: reviewing what exists today, closing the gaps that matter most, and setting up the visibility to notice problems quickly if they do occur.',
      ],
    },
    capabilities: [
      {
        title: 'IAM & Access Reviews',
        description: 'Review identity, roles and permissions for least-privilege access.',
        icon: 'KeyRound',
      },
      {
        title: 'Network Security & Segmentation',
        description: 'Design network boundaries so a breach in one area stays contained.',
        icon: 'Network',
      },
      {
        title: 'Encryption & Key Management',
        description: 'Apply encryption at rest and in transit with properly managed keys.',
        icon: 'Lock',
      },
      {
        title: 'Security Monitoring & Audit Logging',
        description: 'Ensure API and console activity is logged and reviewable after the fact.',
        icon: 'Search',
      },
      {
        title: 'Compliance Readiness',
        description: 'Align infrastructure controls with common compliance expectations.',
        icon: 'ClipboardList',
      },
      {
        title: 'Incident Response Planning',
        description: 'Define ownership, escalation and response steps before an incident happens.',
        icon: 'AlertTriangle',
      },
    ],
    technologies: [
      { group: 'Identity', items: ['IAM', 'SSO / Identity Providers'] },
      { group: 'Network', items: ['Security Groups', 'Network ACLs', 'VPC'] },
      { group: 'Data', items: ['KMS', 'Encryption at Rest/Transit'] },
      { group: 'Visibility', items: ['CloudTrail', 'CloudWatch', 'Audit Logging'] },
    ],
    process: [
      { title: 'Assess', description: 'Review current security posture and exposure.' },
      { title: 'Identify', description: 'Prioritize gaps by risk and impact.' },
      { title: 'Remediate', description: 'Close the highest-priority gaps first.' },
      { title: 'Harden', description: 'Apply baseline controls across the environment.' },
      { title: 'Monitor', description: 'Stand up ongoing security visibility and alerting.' },
    ],
    architecture: [
      { label: 'Identity', icon: 'KeyRound' },
      { label: 'Network Boundary', icon: 'Network' },
      { label: 'Encryption', icon: 'Lock' },
      { label: 'Workloads', icon: 'Server' },
      { label: 'Audit Trail', icon: 'Search' },
      { label: 'Alerts', icon: 'BellRing' },
    ],
    businessValue: [
      { title: 'Reduced Attack Surface', description: 'Fewer exposed paths into production infrastructure.' },
      { title: 'Least-Privilege Access', description: 'Identity and permissions scoped to what is actually needed.' },
      { title: 'Stronger Compliance Posture', description: 'Controls aligned with common compliance expectations.' },
      { title: 'Faster Incident Detection', description: 'Audit logging and monitoring in place before an incident.' },
    ],
    cta: { heading: "Let's Strengthen Your Cloud Security Posture." },
    relatedServices: ['devsecops', 'cloud-solutions', 'site-reliability'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure'],
    seo: {
      title: 'Cloud Security Services | Isha Technologies',
      description:
        'Cloud security services — IAM and access reviews, network segmentation, encryption, audit logging and compliance readiness across AWS, Azure and Google Cloud.',
    },
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}

export function getRelatedServices(service: Service): Service[] {
  return service.relatedServices
    .map((slug) => getServiceBySlug(slug))
    .filter((s): s is Service => Boolean(s));
}

/** Builds a complete, unique Next.js Metadata object for a service page.
 * No `images` here — each service route has its own opengraph-image.tsx
 * file, which Next.js applies automatically. */
export function buildServiceMetadata(service: Service): Metadata {
  const path = `/services/${service.slug}`;
  return {
    title: service.seo.title,
    description: service.seo.description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      siteName: 'Isha Technologies',
      title: service.seo.title,
      description: service.seo.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: service.seo.title,
      description: service.seo.description,
    },
  };
}

export function getAdjacentServices(service: Service): {
  previous: Service | null;
  next: Service | null;
} {
  const index = services.findIndex((s) => s.slug === service.slug);
  return {
    previous: index > 0 ? services[index - 1] : null,
    next: index < services.length - 1 ? services[index + 1] : null,
  };
}
