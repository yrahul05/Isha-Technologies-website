import type { Metadata } from 'next';
import type { Service } from '@/types/types';

export const services: Service[] = [
  // ============================================================
  // CLOUD & INFRASTRUCTURE
  // ============================================================

  // 01 — Cloud Solutions
  {
    slug: 'cloud-solutions',
    title: 'Cloud Solutions',
    category: 'Cloud & Infrastructure',
    eyebrow: 'CLOUD INFRASTRUCTURE',
    heading: 'Cloud Infrastructure Designed for Scale and Control',
    description:
      'We design secure, scalable cloud environments across AWS, Microsoft Azure, Google Cloud, DigitalOcean and Hetzner — aligned with your applications, workloads and operational requirements.',
    overview: {
      heading: 'Infrastructure Designed Around Your Platform',
      paragraphs: [
        'Cloud infrastructure should support growth without becoming difficult to operate. Most production environments are built from the same core building blocks — compute, networking, storage, databases and identity — but how those blocks are architected determines whether the result is easy to run or a constant source of firefighting.',
        'Isha Technologies helps design and implement cloud foundations covering architecture, networking, identity, compute, storage, resilience and operational visibility, so the environment is built correctly the first time rather than patched together under pressure.',
      ],
    },
    problems: [
      {
        title: 'No Clear Architecture',
        description: 'Infrastructure grew organically without a deliberate design, making changes risky and troubleshooting slow.',
        icon: 'Network',
      },
      {
        title: 'Single Points of Failure',
        description: 'A single instance, zone or database going down takes the whole application with it.',
        icon: 'AlertTriangle',
      },
      {
        title: 'Weak Network Boundaries',
        description: 'Everything can reach everything else, with no real separation between public, application and data layers.',
        icon: 'Lock',
      },
      {
        title: 'No Infrastructure as Code',
        description: 'Environments are built by hand, so nobody can say with confidence what is actually configured in production.',
        icon: 'FileCode2',
      },
    ],
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
      { group: 'Cloud Providers', items: ['AWS', 'Microsoft Azure', 'Google Cloud', 'DigitalOcean', 'Hetzner'] },
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
    useCases: [
      'New product launches needing a production-ready foundation from day one',
      'Replacing ad hoc, hand-built infrastructure with a reviewable architecture',
      'Multi-region or multi-AZ resilience for customer-facing applications',
      'Consolidating environments spread across multiple providers',
      'Preparing infrastructure for a funding round or compliance review',
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
    faqs: [
      {
        question: 'Which cloud provider should we use?',
        answer:
          'It depends on your existing tooling, team familiarity, budget and compliance needs. We work across AWS, Microsoft Azure, Google Cloud, DigitalOcean and Hetzner, and help you choose (or validate) a provider based on your actual requirements rather than a default assumption.',
      },
      {
        question: 'Can you work with infrastructure we already have?',
        answer:
          'Yes. Most engagements start with an assessment of the existing environment — what exists, how it is configured, and what is genuinely at risk — before proposing changes, rather than starting over from scratch.',
      },
      {
        question: 'Do you build infrastructure as code, or configure things manually?',
        answer:
          'As code, by default. Manual configuration is fine for early experimentation, but production infrastructure should be reviewable and repeatable — we use Terraform and Ansible so every change has a history and can be recreated reliably.',
      },
      {
        question: 'How long does a typical cloud architecture engagement take?',
        answer:
          "It depends on scope — a focused architecture review can take a few weeks, while a full environment build-out for a new product takes longer. We'll give you a realistic estimate after the initial assessment, not a generic number.",
      },
    ],
    cta: { heading: "Let's Design Your Cloud Foundation." },
    relatedServices: ['cloud-migration-modernization', 'managed-cloud', 'cloud-cost-optimization-finops', 'cloud-security'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Hetzner', 'DigitalOcean', 'BigRock'],
    seo: {
      title: 'Cloud Solutions | Isha Technologies',
      description:
        'Cloud architecture and infrastructure solutions across AWS, Microsoft Azure, Google Cloud, DigitalOcean and Hetzner, designed for secure, reliable and scalable environments.',
    },
  },

  // 02 — Cloud Migration & Modernization
  {
    slug: 'cloud-migration-modernization',
    title: 'Cloud Migration & Modernization',
    category: 'Cloud & Infrastructure',
    eyebrow: 'CLOUD TRANSFORMATION',
    heading: 'Move to the Cloud With a Structured Migration Strategy',
    description:
      'We help teams assess existing infrastructure, plan migration paths and move workloads to cloud environments — including containerization and application modernization — with a structured, validation-driven approach.',
    overview: {
      heading: 'Migration Planned Around Real Dependencies',
      paragraphs: [
        'Cloud migration is not simply moving servers. Successful migration requires understanding applications, dependencies, infrastructure, data and operational requirements before workloads are moved — whether the move is on-premise to cloud, cloud to cloud, or a redesign into containers along the way.',
        'Modernization often happens alongside migration: an application that is simply lifted-and-shifted keeps its old constraints, while one that is containerized or re-architected during the move can take real advantage of the platform it lands on.',
      ],
    },
    problems: [
      {
        title: 'Unclear Migration Scope',
        description: 'Nobody has a complete, accurate inventory of what actually needs to move and what depends on what.',
        icon: 'ClipboardList',
      },
      {
        title: 'Risk of Downtime During Cutover',
        description: 'A migration with no tested rollback plan turns cutover into a high-stakes, all-or-nothing event.',
        icon: 'AlertTriangle',
      },
      {
        title: 'Lift-and-Shift Without Modernization',
        description: 'Moving an application as-is just relocates its existing problems onto new infrastructure.',
        icon: 'ArrowRightLeft',
      },
      {
        title: 'Database Migration Complexity',
        description: 'Moving stateful data safely, with minimal downtime, is harder than moving stateless application servers.',
        icon: 'Database',
      },
    ],
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
        title: 'Application Modernization',
        description: 'Containerize and re-architect applications where it genuinely improves operability.',
        icon: 'Container',
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
    useCases: [
      'On-premise to cloud migration',
      'Cloud-to-cloud migration between providers',
      'Application modernization and containerization',
      'Database migration with minimal downtime',
      'Architecture modernization for legacy applications',
      'Post-acquisition infrastructure consolidation',
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
    faqs: [
      {
        question: "What's the difference between migration and modernization?",
        answer:
          'Migration moves a workload to new infrastructure — same application, new location. Modernization changes how the application itself is built or packaged (for example, containerizing it) so it can actually take advantage of the new environment. They often happen together, but they are different decisions.',
      },
      {
        question: 'Can you migrate our database without downtime?',
        answer:
          'Zero-downtime is achievable for many database migrations using replication to keep source and target in sync until cutover, but it depends on the database engine and current architecture. We assess this specifically before committing to a downtime target.',
      },
      {
        question: 'Do you migrate between cloud providers, not just on-premise to cloud?',
        answer:
          'Yes. Cloud-to-cloud migration needs its own assessment, since equivalent services rarely map one-to-one between providers — IAM models, networking constructs and managed services all differ enough to deserve the same rigor as an on-premise migration.',
      },
      {
        question: 'What happens if something goes wrong during cutover?',
        answer:
          'Every migration plan includes a tested rollback path before cutover happens — not something improvised afterward. We validate the new environment functionally and under load before considering the migration complete.',
      },
    ],
    cta: { heading: "Let's Plan Your Cloud Migration." },
    relatedServices: ['cloud-solutions', 'managed-cloud', 'cloud-cost-optimization-finops'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Hetzner', 'DigitalOcean', 'BigRock'],
    seo: {
      title: 'Cloud Migration & Modernization Services | Isha Technologies',
      description:
        'Structured cloud migration and application modernization — infrastructure assessment, containerization, database migration and post-migration optimization.',
    },
  },

  // 03 — Managed Cloud
  {
    slug: 'managed-cloud',
    title: 'Managed Cloud',
    category: 'Cloud & Infrastructure',
    eyebrow: 'CLOUD OPERATIONS',
    heading: 'Reliable Infrastructure Operations Without the Operational Overhead',
    description:
      'We help teams maintain cloud infrastructure through monitoring, maintenance, operational support, backup oversight, security practices and continuous improvement.',
    overview: {
      heading: 'Day-to-Day Operations Without the Overhead',
      paragraphs: [
        'Running infrastructure well requires ongoing attention — monitoring, patching, backup oversight and steady operational discipline. Ongoing managed support means this work has a defined owner and a defined process, instead of happening reactively whenever something breaks.',
        'We support these day-to-day operational responsibilities so your team can focus on building, while infrastructure stays maintained, monitored and observed on a continuing basis — not just at initial setup.',
      ],
    },
    problems: [
      {
        title: 'No One Owns Day-to-Day Operations',
        description: 'Infrastructure was built once and nobody is responsible for keeping it maintained since.',
        icon: 'Users',
      },
      {
        title: 'Patches and Updates Fall Behind',
        description: 'Security patches and version upgrades get delayed indefinitely because nobody has bandwidth.',
        icon: 'Wrench',
      },
      {
        title: 'Backups Exist but Are Never Tested',
        description: 'Backups run on a schedule, but nobody knows if they would actually restore successfully.',
        icon: 'Archive',
      },
      {
        title: 'Incidents Are Found by Customers First',
        description: 'The team learns about outages from user complaints instead of internal monitoring.',
        icon: 'AlertTriangle',
      },
    ],
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
    useCases: [
      'Teams without a dedicated in-house infrastructure/SRE function',
      'Extending an existing internal team\'s operational capacity',
      'Ongoing patch and security update management',
      'Ongoing backup oversight and recovery readiness',
      'Ongoing incident response and on-call support',
    ],
    businessValue: [
      { title: 'Reduced Operational Load', description: 'Offload day-to-day infrastructure administration.' },
      { title: 'Consistent Maintenance', description: 'Structured patching and update practices.' },
      { title: 'Improved Visibility', description: 'Ongoing monitoring of infrastructure health.' },
      { title: 'Better Preparedness', description: 'Backup and recovery readiness kept current.' },
    ],
    faqs: [
      {
        question: 'What does "managed cloud" actually include day to day?',
        answer:
          'Ongoing monitoring, patch and update management, backup oversight, performance and capacity review, and being the first responder when infrastructure issues come up — the operational work that has to happen continuously, not just at initial setup.',
      },
      {
        question: 'Do you replace our internal team, or work alongside them?',
        answer:
          'Both are possible depending on your situation. Some clients have no internal infrastructure function and want it fully covered; others have a small team and want managed support to extend their operational capacity, especially for coverage outside business hours.',
      },
      {
        question: 'How do you handle incident response?',
        answer:
          "We monitor for the signals that matter and respond when something needs attention — the specific response process (who's contacted, how quickly, what's escalated) is defined during onboarding so expectations are clear from day one.",
      },
      {
        question: 'Is this different from Site Reliability Engineering?',
        answer:
          'Managed Cloud is the ongoing operational work — keeping systems running, patched and backed up. Site Reliability Engineering is more about defining reliability targets (SLIs/SLOs) and engineering the system to meet them. Many engagements include both.',
      },
    ],
    cta: { heading: "Let's Simplify Your Infrastructure Operations." },
    relatedServices: ['site-reliability-engineering', 'observability-monitoring', 'cloud-cost-optimization-finops'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Hetzner', 'DigitalOcean', 'BigRock'],
    seo: {
      title: 'Managed Cloud Services | Isha Technologies',
      description:
        'Managed cloud operations — infrastructure monitoring, maintenance and patching, backup oversight and ongoing performance and security review.',
    },
  },

  // 04 — Cloud Cost Optimization & FinOps
  {
    slug: 'cloud-cost-optimization-finops',
    title: 'Cloud Cost Optimization & FinOps',
    category: 'Cloud & Infrastructure',
    eyebrow: 'CLOUD EFFICIENCY',
    heading: 'Improve Cloud Efficiency Without Compromising Performance',
    description:
      'We analyze cloud usage, infrastructure architecture and resource allocation to identify practical opportunities for improving efficiency, controlling unnecessary spend and building lasting cost governance.',
    overview: {
      heading: 'Efficiency Without Compromising Reliability',
      paragraphs: [
        'Cloud cost optimization and FinOps are related but different. Cost optimization is the technical work — rightsizing, cleaning up idle resources, tuning storage and Kubernetes usage. FinOps is the ongoing practice around it: cost visibility, budgeting, accountability and governance that keeps spend aligned with usage after the initial cleanup.',
        'We do both: an initial optimization pass to remove waste, and — where teams want it — the FinOps practices (dashboards, tagging, review cadences) that keep costs from drifting back up over time.',
      ],
    },
    problems: [
      {
        title: 'Unexpected Cloud Bills',
        description: 'Monthly spend keeps climbing and nobody can clearly explain what is driving the increase.',
        icon: 'AlertTriangle',
      },
      {
        title: 'Idle and Unused Resources',
        description: 'Unattached storage volumes, idle load balancers and forgotten test environments quietly cost money.',
        icon: 'HardDrive',
      },
      {
        title: 'Over-Provisioned Infrastructure',
        description: 'Instances sized for a peak that rarely occurs, running at a fraction of capacity most of the time.',
        icon: 'SlidersHorizontal',
      },
      {
        title: 'Poor Cost Visibility',
        description: 'Spend is not broken down by team, service or environment, so nobody owns their share of it.',
        icon: 'PieChart',
      },
      {
        title: 'Kubernetes Resource Waste',
        description: 'Over-requested pods reserve cluster capacity they never actually use.',
        icon: 'Boxes',
      },
    ],
    capabilities: [
      {
        title: 'Cloud Cost Audits',
        description: 'Review usage and spend patterns to find where money is actually going.',
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
        title: 'Kubernetes Cost Optimization',
        description: 'Review cluster resource requests, limits and autoscaling configuration.',
        icon: 'Boxes',
      },
      {
        title: 'Cost Visibility & Governance',
        description: 'Set up tagging, dashboards and review cadences that keep spend accountable.',
        icon: 'ClipboardList',
      },
      {
        title: 'Reserved Capacity & Savings Options',
        description: 'Evaluate appropriate purchasing models based on actual, sustained workload requirements.',
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
      { title: 'Govern', description: 'Set up tagging, budgets and ownership.' },
      { title: 'Monitor', description: 'Track efficiency on an ongoing basis.' },
    ],
    architecture: [
      { label: 'Usage', icon: 'PieChart' },
      { label: 'Analysis', icon: 'Search' },
      { label: 'Rightsizing', icon: 'SlidersHorizontal' },
      { label: 'Optimization', icon: 'Gauge' },
      { label: 'Monitoring', icon: 'Activity' },
    ],
    useCases: [
      'Unexpected month-over-month cloud bill increases',
      'Pre-funding-round cost efficiency review',
      'Kubernetes clusters with unclear resource allocation',
      'Multi-team environments with no cost accountability',
      'Evaluating reserved instances or savings plans',
    ],
    businessValue: [
      { title: 'Reduced Waste', description: 'Identify underused and over-provisioned resources.' },
      { title: 'Right-Sized Infrastructure', description: 'Align resources with actual workload needs.' },
      { title: 'Sustained Efficiency', description: 'Ongoing visibility keeps spend aligned with usage.' },
      { title: 'Preserved Performance', description: 'Efficiency improvements without compromising reliability.' },
    ],
    faqs: [
      {
        question: "What's the difference between cost optimization and FinOps?",
        answer:
          'Cost optimization is the technical work of finding and fixing waste — rightsizing, removing idle resources, tuning storage. FinOps is the ongoing organizational practice that keeps costs accountable afterward: tagging, budgets, dashboards and regular review, usually shared across engineering and finance.',
      },
      {
        question: 'Will optimizing costs hurt performance or reliability?',
        answer:
          'Not if done properly. We validate changes against actual utilization data over a meaningful window, not a single traffic spike, and every rightsizing change is reviewed against performance requirements before it ships.',
      },
      {
        question: 'Can you help with Kubernetes-specific cost issues?',
        answer:
          'Yes — Kubernetes cost efficiency is closely tied to resource requests and limits. We review actual pod resource usage against what is requested, and tune the Horizontal Pod Autoscaler and Cluster Autoscaler so capacity tracks real demand.',
      },
      {
        question: 'Do you guarantee a specific percentage of savings?',
        answer:
          "No — savings potential depends entirely on how much waste currently exists in your environment, which varies a lot between accounts. We'll give you a realistic estimate after the initial audit, not a generic promised percentage.",
      },
    ],
    cta: { heading: "Let's Improve Your Cloud Efficiency." },
    relatedServices: ['managed-cloud', 'kubernetes-container-platforms', 'cloud-solutions'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure'],
    seo: {
      title: 'Cloud Cost Optimization & FinOps Services | Isha Technologies',
      description:
        'Cloud cost optimization and FinOps practices — resource utilization audits, rightsizing, Kubernetes cost efficiency and lasting cost governance.',
    },
  },

  // ============================================================
  // DEVOPS & PLATFORM
  // ============================================================

  // 05 — DevOps Solutions
  {
    slug: 'devops-solutions',
    title: 'DevOps Solutions',
    category: 'DevOps & Platform',
    eyebrow: 'DELIVERY AUTOMATION',
    heading: 'Automate the Path From Code to Production',
    description:
      'We build repeatable delivery workflows that connect source control, testing, infrastructure, security and deployment into a reliable engineering process — using Jenkins, GitHub Actions, GitLab CI/CD and Docker.',
    overview: {
      heading: 'Delivery Built on Repeatable Engineering Practice',
      paragraphs: [
        'Modern delivery depends on more than a CI pipeline. We help teams standardize environments, automate infrastructure and create deployment workflows that are easier to maintain and operate — whether that means building CI/CD from scratch or improving an existing pipeline that has become hard to trust.',
        'A reliable pipeline is judged less by how fast it runs and more by whether every release it produces is consistent, verifiable and reversible.',
      ],
    },
    problems: [
      {
        title: 'Manual Deployments',
        description: 'Releases depend on someone running commands from their laptop, with no consistent process.',
        icon: 'UploadCloud',
      },
      {
        title: 'Inconsistent Environments',
        description: 'Dev, staging and production drift apart, so "it worked in staging" stops meaning anything.',
        icon: 'Layers',
      },
      {
        title: 'Slow, Unreliable Releases',
        description: 'Deployments are risky enough that the team dreads shipping and batches changes into large releases.',
        icon: 'AlertTriangle',
      },
      {
        title: 'No Rollback Path',
        description: 'When a deployment goes wrong, recovery is improvised under pressure instead of a tested procedure.',
        icon: 'ArrowRightLeft',
      },
    ],
    capabilities: [
      {
        title: 'CI/CD Automation',
        description: 'Design pipelines for build, test, security checks and deployment using Jenkins, GitHub Actions or GitLab CI/CD.',
        icon: 'GitBranch',
      },
      {
        title: 'Infrastructure Automation',
        description: 'Manage infrastructure through repeatable and version-controlled workflows.',
        icon: 'FileCode2',
      },
      {
        title: 'Deployment & Release Automation',
        description: 'Reduce manual release processes through automated and consistent deployments.',
        icon: 'UploadCloud',
      },
      {
        title: 'Environment Management',
        description: 'Create consistent development, staging and production environments.',
        icon: 'Layers',
      },
      {
        title: 'Docker-Based Workflows',
        description: 'Package applications into consistent, portable container images.',
        icon: 'Container',
      },
      {
        title: 'Pipeline Security',
        description: 'Integrate security checks and controlled access into delivery workflows.',
        icon: 'ShieldCheck',
      },
    ],
    technologies: [
      { group: 'CI/CD', items: ['Jenkins', 'GitHub Actions', 'GitLab CI/CD'] },
      { group: 'Source Control', items: ['Git', 'GitHub', 'GitLab'] },
      { group: 'Containers', items: ['Docker', 'Kubernetes'] },
      { group: 'Automation', items: ['Terraform', 'Ansible'] },
    ],
    process: [
      { title: 'Assess', description: 'Review the current delivery workflow.' },
      { title: 'Standardize', description: 'Align environments and practices.' },
      { title: 'Automate', description: 'Build CI/CD and infrastructure automation.' },
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
    useCases: [
      'Building CI/CD from scratch for a new project',
      'Migrating from manual deployments to automated pipelines',
      'Standardizing inconsistent environments across teams',
      'Introducing Docker-based, portable application builds',
      'Adding release gates and rollback paths to an existing pipeline',
    ],
    businessValue: [
      { title: 'Faster, More Consistent Releases', description: 'Standardized pipelines reduce release variability.' },
      { title: 'Reduced Manual Work', description: 'Automation replaces repetitive deployment steps.' },
      { title: 'Repeatable Environments', description: 'Development, staging and production stay aligned.' },
      { title: 'Improved Deployment Control', description: 'Clear gates and checks throughout delivery.' },
    ],
    faqs: [
      {
        question: 'Which CI/CD tool do you recommend — Jenkins, GitHub Actions or GitLab CI/CD?',
        answer:
          "It depends on where your code already lives and your team's existing familiarity. GitHub Actions and GitLab CI/CD integrate tightly with their respective platforms and need less infrastructure to run; Jenkins offers more flexibility if you need it, at the cost of having to operate it yourself. We help you choose based on your actual setup.",
      },
      {
        question: 'Can you improve an existing pipeline instead of rebuilding it?',
        answer:
          'Yes — most engagements start by reviewing what already exists. We often find the same pipeline can be made faster and more reliable with targeted changes, rather than needing a full rebuild.',
      },
      {
        question: 'Do you set up Docker even if we are not using Kubernetes yet?',
        answer:
          'Yes. Containerizing an application with Docker is valuable on its own — consistent builds, portable environments — independent of whether you run it on Kubernetes, a simpler container host, or plain VMs.',
      },
      {
        question: "What's included in 'pipeline security'?",
        answer:
          'Scoping pipeline permissions narrowly, storing secrets in a proper secrets manager rather than pipeline config files, and adding security checks as pipeline stages. For deeper security scanning (SAST, DAST, dependency scanning), see DevSecOps.',
      },
    ],
    cta: { heading: "Let's Improve Your Delivery Pipeline." },
    relatedServices: ['devsecops', 'platform-engineering', 'infrastructure-as-code-gitops', 'kubernetes-container-platforms'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Hetzner', 'DigitalOcean'],
    seo: {
      title: 'DevOps Solutions | Isha Technologies',
      description:
        'DevOps consulting and CI/CD automation with Jenkins, GitHub Actions and GitLab CI/CD — connecting source control, testing and deployment into a reliable delivery process.',
    },
  },

  // 06 — DevSecOps
  {
    slug: 'devsecops',
    title: 'DevSecOps',
    category: 'DevOps & Platform',
    eyebrow: 'SECURE DELIVERY',
    heading: 'Security Integrated Into the Delivery Lifecycle',
    description:
      'We integrate practical security controls into infrastructure and delivery workflows — secure CI/CD, dependency and container scanning, and secrets management — so security becomes part of the engineering process rather than a final checkpoint.',
    overview: {
      heading: 'Shift-Left Security, Applied Practically',
      paragraphs: [
        'Security controls added at the end of a delivery pipeline tend to slow teams down and get bypassed under pressure. Shift-left security means running checks earlier — at commit, build and test time — so issues surface while they are still cheap to fix.',
        'We integrate practical checks — static analysis, dependency and container scanning, secret detection and access controls — directly into existing development and delivery workflows, rather than bolting on a separate security review process.',
      ],
    },
    problems: [
      {
        title: 'Security Reviewed Only Before Release',
        description: 'Problems are found late, when they are most expensive to fix and most likely to delay a launch.',
        icon: 'AlertTriangle',
      },
      {
        title: 'Vulnerable Dependencies Reach Production',
        description: 'Third-party packages with known CVEs ship because nobody is scanning for them automatically.',
        icon: 'PackageSearch',
      },
      {
        title: 'Secrets Committed to Source Control',
        description: 'API keys and credentials end up in git history because there is no automated detection.',
        icon: 'KeyRound',
      },
      {
        title: 'Unscanned Container Images',
        description: 'Images are built and deployed without checking the base OS layer for known vulnerabilities.',
        icon: 'Container',
      },
    ],
    capabilities: [
      {
        title: 'Secure CI/CD',
        description: 'Run security checks at each pipeline stage — commit, build, test and deploy.',
        icon: 'GitBranch',
      },
      {
        title: 'Security Scanning',
        description: 'Integrate static analysis (SAST) and dynamic testing (DAST) into development workflows.',
        icon: 'FileCode2',
      },
      {
        title: 'Dependency Scanning',
        description: 'Identify vulnerable third-party dependencies before deployment.',
        icon: 'PackageSearch',
      },
      {
        title: 'Container Security',
        description: 'Scan container images and improve image security practices.',
        icon: 'Container',
      },
      {
        title: 'Secrets Management',
        description: 'Detect exposed credentials and improve how secrets are stored and accessed.',
        icon: 'KeyRound',
      },
      {
        title: 'Security Automation',
        description: 'Add automated security gates and controlled access throughout delivery pipelines.',
        icon: 'ShieldCheck',
      },
    ],
    technologies: [
      { group: 'Source & CI/CD', items: ['Git', 'GitHub Actions', 'GitLab CI/CD', 'Jenkins'] },
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
    useCases: [
      'Adding security scanning to an existing CI/CD pipeline',
      'Removing hardcoded secrets from source control',
      'Establishing container image scanning before deployment',
      'Meeting a security requirement from a customer or partner',
      'Reducing time-to-fix for known vulnerabilities',
    ],
    businessValue: [
      { title: 'Earlier Issue Detection', description: 'Security checks run throughout the pipeline, not at the end.' },
      { title: 'Reduced Exposure', description: 'Fewer vulnerable dependencies and exposed secrets reach production.' },
      { title: 'Controlled Access', description: 'Least-privilege principles applied across delivery.' },
      { title: 'Consistent Security Practice', description: 'Security becomes part of the engineering workflow.' },
    ],
    faqs: [
      {
        question: "What's the difference between DevSecOps and Cloud Security?",
        answer:
          'DevSecOps is specifically about securing the delivery pipeline — code scanning, dependency checks, container scanning, secrets in CI/CD. Cloud Security is broader infrastructure security — IAM, network segmentation, encryption. Many clients need both; they address different layers.',
      },
      {
        question: 'Will security scanning slow down our pipeline?',
        answer:
          'Well-integrated scanning adds minutes, not hours, to a pipeline run, and most checks can run in parallel with tests. The alternative — finding the same issue in production — costs far more time than the scan itself.',
      },
      {
        question: 'Do you use specific scanning tools, or is this a custom build?',
        answer:
          'We integrate established SAST, DAST, dependency and container scanning tooling into your existing CI/CD platform (Jenkins, GitHub Actions or GitLab CI/CD) rather than building custom scanners — the value is in the integration and the process around the results, not reinventing the scanning itself.',
      },
      {
        question: 'What happens when a scan finds a vulnerability?',
        answer:
          'We help define a triage process — prioritizing findings by severity and exploitability, assigning ownership, and setting realistic time-to-fix targets — so scan results turn into fixed issues instead of an ignored backlog.',
      },
    ],
    cta: { heading: "Let's Strengthen Your Delivery Security." },
    relatedServices: ['devops-solutions', 'cloud-security', 'kubernetes-container-platforms'],
    seo: {
      title: 'DevSecOps Services | Isha Technologies',
      description:
        'DevSecOps services integrating secure CI/CD, dependency and container scanning, secrets management and shift-left security into delivery pipelines.',
    },
  },

  // 07 — Platform Engineering
  {
    slug: 'platform-engineering',
    title: 'Platform Engineering',
    category: 'DevOps & Platform',
    eyebrow: 'PLATFORM ENGINEERING',
    heading: 'Build Internal Platforms That Make Infrastructure Easier to Operate',
    description:
      'We create internal developer platforms, self-service infrastructure and golden paths that give engineering teams a consistent, supported way to provision and manage infrastructure.',
    overview: {
      heading: 'Reducing Friction Between Teams and Infrastructure',
      paragraphs: [
        'Engineering teams lose time when every project has to solve infrastructure problems from scratch. Platform Engineering builds an internal platform — self-service workflows, golden paths and reusable modules — that sits between raw cloud infrastructure and application teams, exposing a smaller, curated surface area.',
        "It differs from traditional DevOps in focus: DevOps is about the delivery process for one team or application; Platform Engineering is about building the shared internal product that MANY teams use to deliver, treating the platform itself as something with real users and an ongoing roadmap.",
      ],
    },
    problems: [
      {
        title: 'Every Team Solves Infrastructure Alone',
        description: 'Each project reinvents networking, CI/CD and deployment patterns from scratch.',
        icon: 'Users',
      },
      {
        title: 'Infrastructure Requests Create Bottlenecks',
        description: 'Developers file a ticket and wait for a platform or ops team to provision what they need.',
        icon: 'ClipboardList',
      },
      {
        title: 'Inconsistent Standards Across Services',
        description: 'Security defaults, tagging and monitoring hooks vary because nothing enforces them centrally.',
        icon: 'LayoutGrid',
      },
      {
        title: 'Developers Need Deep Infrastructure Knowledge',
        description: 'Shipping a simple service requires understanding Kubernetes, networking and IAM in depth.',
        icon: 'Route',
      },
    ],
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
        title: 'Developer Environments',
        description: 'Standardize consistent, ready-to-use development environments.',
        icon: 'Server',
      },
      {
        title: 'CI/CD Integration',
        description: 'Wire the platform into existing pipelines so golden paths are the easiest option, not an extra step.',
        icon: 'GitBranch',
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
    useCases: [
      'Multiple teams provisioning infrastructure inconsistently',
      'Reducing time-to-first-deploy for new services',
      'Standardizing Kubernetes usage across engineering teams',
      'Building self-service environments to reduce platform-team ticket load',
      'Encoding security and tagging standards into reusable templates',
    ],
    businessValue: [
      { title: 'Less Infrastructure Friction', description: 'Common tasks become self-service.' },
      { title: 'Standardized Engineering Workflows', description: 'Golden paths guide common decisions.' },
      { title: 'Reusable Infrastructure', description: 'Shared modules reduce duplicated effort.' },
      { title: 'Better Developer Experience', description: 'Less time spent on infrastructure mechanics.' },
    ],
    faqs: [
      {
        question: 'How is Platform Engineering different from traditional DevOps?',
        answer:
          "DevOps focuses on the delivery process — build, test, deploy — usually for one team or application. Platform Engineering builds a shared internal product (templates, self-service workflows, golden paths) that many teams use, and treats that platform itself as having real users whose feedback shapes its roadmap.",
      },
      {
        question: 'Do we need Kubernetes to benefit from Platform Engineering?',
        answer:
          "Kubernetes is a common foundation because its API is extensible, but the core idea — golden paths, self-service, reusable modules — applies to any infrastructure. We tailor the platform to what you're actually running.",
      },
      {
        question: 'Will this force developers into a rigid, one-size-fits-all path?',
        answer:
          'Golden paths work because they are the easiest option, not the only one. Teams with genuinely different requirements can still deviate — the platform just makes the common case fast and standardized by default.',
      },
      {
        question: 'Who maintains the platform after it is built?',
        answer:
          "Someone on your side needs to own it long-term — its reliability, roadmap and evolution — the same way a product needs a product owner. We help set that up, but a platform left unmaintained after rollout tends to fall out of use.",
      },
    ],
    cta: { heading: "Let's Build a Better Platform for Your Engineers." },
    relatedServices: ['devops-solutions', 'infrastructure-as-code-gitops', 'kubernetes-container-platforms'],
    seo: {
      title: 'Platform Engineering Services | Isha Technologies',
      description:
        'Internal developer platforms, golden paths and self-service infrastructure that make infrastructure easier for engineering teams to operate.',
    },
  },

  // 08 — Infrastructure as Code & GitOps
  {
    slug: 'infrastructure-as-code-gitops',
    title: 'Infrastructure as Code & GitOps',
    category: 'DevOps & Platform',
    eyebrow: 'INFRASTRUCTURE AS CODE',
    heading: 'Infrastructure Defined, Reviewed and Versioned as Code',
    description:
      'We design and implement Terraform and Ansible-based infrastructure as code, plus Git-based GitOps workflows — reusable modules, remote state management and CI/CD-integrated automation that make infrastructure changes reviewable and repeatable.',
    overview: {
      heading: 'The IaC and GitOps Craft, Not Just the Tools',
      paragraphs: [
        'Writing Terraform or Ansible that works is different from writing infrastructure code that stays maintainable as a team and its infrastructure grow — module design, state management and environment structure matter as much as the resource definitions themselves.',
        'GitOps takes this further: the desired state of infrastructure and applications lives in Git, and automated tooling reconciles the live environment to match it — so Git history becomes the single source of truth for what is actually running, and every change goes through the same review process as application code.',
      ],
    },
    problems: [
      {
        title: 'Infrastructure Changed by Hand',
        description: 'Console changes happen outside any review process, so nobody can say what changed or why.',
        icon: 'AlertTriangle',
      },
      {
        title: 'Configuration Drift',
        description: 'The real environment slowly diverges from what the code says it should be.',
        icon: 'Search',
      },
      {
        title: 'Unsafe Shared State',
        description: 'Two people running infrastructure changes at once risk corrupting each other\'s work.',
        icon: 'Database',
      },
      {
        title: 'Inconsistent Environments',
        description: 'Dev, staging and production are configured slightly differently because nothing forces parity.',
        icon: 'Layers',
      },
    ],
    capabilities: [
      {
        title: 'Terraform Module Design',
        description: 'Build reusable, parameterized modules that encode organizational standards once.',
        icon: 'FileCode2',
      },
      {
        title: 'Configuration Management',
        description: 'Use Ansible for repeatable configuration of servers and services.',
        icon: 'Settings2',
      },
      {
        title: 'Remote State Management',
        description: 'Set up safe, locked remote state for teams working on shared infrastructure.',
        icon: 'Database',
      },
      {
        title: 'GitOps Workflows',
        description: 'Drive infrastructure and deployments from Git as the single source of truth.',
        icon: 'GitPullRequest',
      },
      {
        title: 'Infrastructure CI/CD Integration',
        description: 'Run plan on every change and apply only after review and approval, using GitHub Actions or similar.',
        icon: 'GitBranch',
      },
      {
        title: 'Drift Detection',
        description: 'Catch infrastructure changed outside of code before it causes an incident.',
        icon: 'Search',
      },
    ],
    technologies: [
      { group: 'IaC', items: ['Terraform', 'Ansible'] },
      { group: 'Version Control', items: ['Git', 'GitHub', 'GitLab'] },
      { group: 'CI/CD', items: ['GitHub Actions', 'GitLab CI/CD'] },
      { group: 'Providers', items: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Kubernetes'] },
    ],
    process: [
      { title: 'Audit', description: 'Review existing infrastructure and any current automation.' },
      { title: 'Design', description: 'Plan module structure and state layout.' },
      { title: 'Modularize', description: 'Build reusable, standards-encoding modules.' },
      { title: 'Automate', description: 'Wire plan/apply and GitOps reconciliation into CI/CD.' },
      { title: 'Review', description: 'Establish a pull-request-based change process.' },
      { title: 'Maintain', description: 'Monitor for drift and evolve modules over time.' },
    ],
    architecture: [
      { label: 'Git Repository', icon: 'GitBranch' },
      { label: 'Pull Request', icon: 'GitPullRequest' },
      { label: 'Plan', icon: 'Search' },
      { label: 'Review', icon: 'CheckCircle2' },
      { label: 'Apply / Sync', icon: 'UploadCloud' },
      { label: 'State', icon: 'Database' },
    ],
    useCases: [
      'Bringing existing, manually-managed infrastructure under version control',
      'Building reusable Terraform modules across multiple environments',
      'Setting up safe, team-shared remote state',
      'Adopting GitOps for Kubernetes deployments',
      'Adding infrastructure change review to an existing workflow',
    ],
    businessValue: [
      { title: 'Reviewable Infrastructure Changes', description: 'Every change is visible before it happens, not after.' },
      { title: 'Reduced Configuration Drift', description: 'Regular plan runs and GitOps reconciliation surface drift early.' },
      { title: 'Faster Environment Provisioning', description: 'New environments stood up from proven modules.' },
      { title: 'Consistent Environments', description: 'Dev, staging and production built from the same source.' },
    ],
    faqs: [
      {
        question: "What's the difference between Terraform and Ansible?",
        answer:
          'Terraform provisions infrastructure — creating the servers, networks and databases themselves. Ansible configures what runs on top of that infrastructure. Many environments use both: Terraform to stand up resources, Ansible to configure them.',
      },
      {
        question: 'What is GitOps, specifically?',
        answer:
          'GitOps means the desired state of your infrastructure or application lives in a Git repository, and automated tooling continuously reconciles the live environment to match it. Instead of running deployment commands manually, you merge a pull request and the system converges to that state.',
      },
      {
        question: 'Do you use Argo CD or GitHub Actions for GitOps?',
        answer:
          "We use GitHub Actions for CI/CD-driven infrastructure automation as our primary approach; we'll only bring in additional GitOps-specific tooling like Argo CD where it is genuinely the right fit for a given Kubernetes setup, not as a default add-on.",
      },
      {
        question: 'Can you migrate our manually-managed infrastructure into Terraform?',
        answer:
          "Yes — this is one of our most common engagements. We import existing resources into Terraform state carefully, verifying the generated configuration matches reality before anyone relies on it for future changes.",
      },
    ],
    cta: { heading: "Let's Turn Your Infrastructure Into Code." },
    relatedServices: ['devops-solutions', 'platform-engineering', 'cloud-solutions'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure'],
    seo: {
      title: 'Infrastructure as Code & GitOps Services | Isha Technologies',
      description:
        'Terraform and Ansible infrastructure as code, plus Git-based GitOps workflows — reusable modules, remote state management and CI/CD-integrated automation.',
    },
  },

  // ============================================================
  // CLOUD-NATIVE
  // ============================================================

  // 09 — Kubernetes & Container Platforms
  {
    slug: 'kubernetes-container-platforms',
    title: 'Kubernetes & Container Platforms',
    category: 'Cloud-Native',
    eyebrow: 'CONTAINER PLATFORM ENGINEERING',
    heading: 'Kubernetes Platforms Built for Production Workloads',
    description:
      'We design, deploy and improve Kubernetes and Amazon EKS environments with a focus on reliability, security, scalability, networking and operational visibility.',
    overview: {
      heading: 'Operational Discipline Behind Every Cluster',
      paragraphs: [
        'Kubernetes provides powerful orchestration, but production environments require thoughtful architecture and operational discipline. Creating a cluster takes minutes; operating one reliably depends on decisions about workload architecture, networking, resource management, security and observability.',
        'We help teams build Kubernetes platforms — self-managed or on Amazon EKS — that are easier to deploy, monitor, secure, scale and maintain as workloads and team size grow.',
      ],
    },
    problems: [
      {
        title: 'Clusters Without Production Discipline',
        description: 'Pods are managed directly instead of through controllers, losing Kubernetes\' self-healing benefits.',
        icon: 'Boxes',
      },
      {
        title: 'No Resource Requests or Limits',
        description: 'Pods without requests/limits set starve their neighbors or become invisible to the scheduler.',
        icon: 'SlidersHorizontal',
      },
      {
        title: 'Open Internal Networking',
        description: 'Any pod can reach any other pod by default, with no NetworkPolicies restricting traffic.',
        icon: 'Lock',
      },
      {
        title: 'No Real Observability',
        description: 'Nobody can quickly tell which service is failing when something goes wrong in the cluster.',
        icon: 'Search',
      },
      {
        title: 'Manual, Risky Upgrades',
        description: 'Kubernetes version upgrades are postponed because nobody trusts the process to go smoothly.',
        icon: 'AlertTriangle',
      },
    ],
    capabilities: [
      {
        title: 'Cluster Architecture',
        description: 'Design production-ready cluster structures and workload organization, on self-managed Kubernetes or Amazon EKS.',
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
        title: 'Cluster Security',
        description: 'Apply NetworkPolicies, RBAC and Pod Security Standards to limit blast radius.',
        icon: 'Lock',
      },
      {
        title: 'Monitoring & Upgrades',
        description: 'Integrate monitoring and logging, and manage version upgrades safely.',
        icon: 'LineChart',
      },
    ],
    technologies: [
      { group: 'Containers', items: ['Kubernetes', 'Amazon EKS', 'Docker', 'Helm'] },
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
    useCases: [
      'Moving from a single-server deployment to a Kubernetes platform',
      'Migrating a self-managed cluster to Amazon EKS',
      'Production readiness review before a major launch',
      'Reducing Kubernetes upgrade risk and downtime',
      'Improving cluster security and network segmentation',
    ],
    businessValue: [
      { title: 'Consistent Container Orchestration', description: 'Standardized cluster and workload patterns.' },
      { title: 'Improved Workload Scalability', description: 'Autoscaling matched to real demand.' },
      { title: 'Better Operational Visibility', description: 'Monitoring and logging built into the platform.' },
      { title: 'Repeatable Deployments', description: 'Helm-based workflows reduce deployment drift.' },
    ],
    faqs: [
      {
        question: 'Should we use self-managed Kubernetes or Amazon EKS?',
        answer:
          'EKS removes the operational burden of managing the control plane yourself, which is usually worth it unless you have a specific reason to self-host. We assess your team size, existing AWS footprint and operational capacity before recommending either.',
      },
      {
        question: 'Do you help with Kubernetes version upgrades?',
        answer:
          "Yes. We plan upgrades against your actual workload compatibility, test in a non-production environment first, and roll out in a way designed to avoid surprise downtime — rather than deferring upgrades indefinitely.",
      },
      {
        question: 'How do you handle Kubernetes cost efficiency?',
        answer:
          'Resource requests and limits are the foundation — we tune these based on real observed usage, then layer in the Horizontal Pod Autoscaler and Cluster Autoscaler so capacity tracks actual demand. For a deeper cost review, see Cloud Cost Optimization & FinOps.',
      },
      {
        question: 'Is Kubernetes overkill for a smaller application?',
        answer:
          "Sometimes, yes. If your workload does not need multi-service orchestration or has simple scaling needs, a simpler container host or managed platform may serve you better. We'll tell you honestly if Kubernetes is not the right fit yet.",
      },
    ],
    cta: { heading: "Let's Build a Kubernetes Platform for Production." },
    relatedServices: ['devops-solutions', 'platform-engineering', 'observability-monitoring', 'site-reliability-engineering'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Hetzner'],
    seo: {
      title: 'Kubernetes & Container Platform Services | Isha Technologies',
      description:
        'Kubernetes and Amazon EKS platform engineering — cluster architecture, networking, scaling, security and operational visibility for production workloads.',
    },
  },

  // 10 — Observability & Monitoring
  {
    slug: 'observability-monitoring',
    title: 'Observability & Monitoring',
    category: 'Cloud-Native',
    eyebrow: 'OPERATIONAL VISIBILITY',
    heading: 'Turn Infrastructure Signals Into Operational Visibility',
    description:
      'We bring metrics, logs and traces together — using Prometheus, Grafana, AWS CloudWatch and the ELK Stack — to help engineering teams understand system behavior, identify issues and respond with real operational context.',
    overview: {
      heading: 'Observability vs. Traditional Monitoring',
      paragraphs: [
        'Traditional monitoring tells you something is wrong — a threshold was crossed, a check failed. Observability helps you figure out why, by connecting metrics, logs and traces so an engineer can go from "something is wrong" to "here is the specific cause" without guessing.',
        'As systems become more distributed, the gap between the two grows. We bring these three signal types together — with a shared identifier like a trace ID connecting them — so correlating signals during an incident is fast instead of a manual, error-prone exercise.',
      ],
    },
    problems: [
      {
        title: 'Alerts Without Context',
        description: 'An alert fires, but nobody can tell what it means or where to start investigating.',
        icon: 'BellRing',
      },
      {
        title: 'Signals Scattered Across Tools',
        description: 'Metrics live in one place, logs in another, with no shared identifier connecting them.',
        icon: 'Search',
      },
      {
        title: 'Dashboards Nobody Trusts',
        description: 'Every metric is displayed at once, so nobody can tell at a glance if a service is actually healthy.',
        icon: 'LineChart',
      },
      {
        title: 'Slow Incident Investigation',
        description: 'Finding the root cause of an incident takes hours of manual log searching.',
        icon: 'AlertTriangle',
      },
    ],
    capabilities: [
      {
        title: 'Metrics',
        description: 'Collect and organize infrastructure and application metrics with Prometheus, Grafana and CloudWatch.',
        icon: 'LineChart',
      },
      {
        title: 'Logs',
        description: 'Centralize and structure logs for operational investigation using the ELK Stack.',
        icon: 'FileText',
      },
      {
        title: 'Traces',
        description: 'Improve visibility into distributed application behavior.',
        icon: 'Waypoints',
      },
      {
        title: 'Dashboards',
        description: 'Build layered dashboards that answer specific operational questions at a glance.',
        icon: 'LayoutGrid',
      },
      {
        title: 'Alerting',
        description: 'Create actionable alerts around meaningful, user-facing operational conditions.',
        icon: 'BellRing',
      },
      {
        title: 'Incident Visibility',
        description: 'Connect system signals with operational response and investigation.',
        icon: 'Search',
      },
    ],
    technologies: [
      { group: 'Metrics & Dashboards', items: ['Prometheus', 'Grafana', 'AWS CloudWatch'] },
      { group: 'Logs', items: ['ELK Stack'] },
      { group: 'Platform', items: ['Kubernetes'] },
    ],
    process: [
      { title: 'Collect', description: 'Gather metrics, logs and traces.' },
      { title: 'Correlate', description: 'Connect signals across systems with shared identifiers.' },
      { title: 'Visualize', description: 'Build clear, layered operational dashboards.' },
      { title: 'Alert', description: 'Define actionable, symptom-based alert conditions.' },
      { title: 'Investigate', description: 'Support faster root-cause analysis during incidents.' },
      { title: 'Improve', description: 'Refine signals over time.' },
    ],
    architecture: [
      { label: 'Metrics', icon: 'LineChart' },
      { label: 'Logs', icon: 'FileText' },
      { label: 'Traces', icon: 'Waypoints' },
      { label: 'Correlation', icon: 'GitMerge' },
      { label: 'Dashboards', icon: 'LayoutGrid' },
      { label: 'Alerts', icon: 'BellRing' },
      { label: 'Response', icon: 'Zap' },
    ],
    useCases: [
      'Cloud monitoring for a new or existing production environment',
      'Replacing noisy, low-signal alerts with actionable ones',
      'Centralizing logs currently scattered across services',
      'Setting up Grafana dashboards for a Kubernetes platform',
      'Reducing mean time to investigate for production incidents',
    ],
    businessValue: [
      { title: 'Faster Root Cause Analysis', description: 'Correlated metrics, logs and traces speed up investigation.' },
      { title: 'Actionable Alerting', description: 'Alerts tied to meaningful operational conditions.' },
      { title: 'Shared Operational Context', description: 'Teams work from the same system signals.' },
      { title: 'Improved System Understanding', description: 'Visibility into how distributed systems actually behave.' },
    ],
    faqs: [
      {
        question: 'Is observability just monitoring with a different name?',
        answer:
          "No. Monitoring detects that something is wrong. Observability is about being able to ask arbitrary questions of your system's behavior after the fact — which requires metrics, logs and traces to be connected, not just collected separately.",
      },
      {
        question: 'Do we need all three — metrics, logs and traces — or can we start with one?',
        answer:
          'Metrics are usually the fastest to set up and give the earliest value for alerting. Logs and traces add depth for investigation. We typically start with metrics and alerting, then layer in logs and traces where distributed request tracking genuinely matters.',
      },
      {
        question: 'Do you work with tools we already have, like an existing Grafana setup?',
        answer:
          "Yes — we commonly build on existing Prometheus, Grafana, CloudWatch or ELK deployments rather than replacing them, focusing on filling gaps (correlation, alerting quality, dashboard design) rather than a wholesale tooling change.",
      },
      {
        question: "What's an example of a 'good' alert versus a 'bad' one?",
        answer:
          'A good alert is tied to a user-facing symptom — elevated error rate, degraded latency, a failed health check. A bad alert fires on every internal metric crossing an arbitrary threshold, regardless of whether it affects users — that pattern trains teams to ignore alerts.',
      },
    ],
    cta: { heading: "Let's Make Your Infrastructure Easier to Understand." },
    relatedServices: ['site-reliability-engineering', 'kubernetes-container-platforms', 'ai-powered-devops-aiops'],
    seo: {
      title: 'Observability & Monitoring Services | Isha Technologies',
      description:
        'Observability and cloud monitoring with Prometheus, Grafana, AWS CloudWatch and the ELK Stack — metrics, logs and traces for faster investigation.',
    },
  },

  // 11 — Site Reliability Engineering
  {
    slug: 'site-reliability-engineering',
    title: 'Site Reliability Engineering',
    category: 'Cloud-Native',
    eyebrow: 'RELIABILITY ENGINEERING',
    heading: 'Reliability Designed Into Production Systems',
    description:
      'We help teams improve production reliability through measurable service objectives, incident response processes, capacity planning and practical operational automation.',
    overview: {
      heading: 'Reliability as a Deliberate Engineering Practice',
      paragraphs: [
        'Reliable systems are the result of deliberate practice, not chance. Site Reliability Engineering applies engineering rigor — measurement, targets, trade-off analysis — to what is often treated as purely reactive operational firefighting.',
        'We help teams define meaningful Service Level Indicators and Objectives, understand the error budget those objectives create, build observability around them, and put practical incident response and capacity planning processes in place.',
      ],
    },
    problems: [
      {
        title: 'No Defined Reliability Targets',
        description: 'Nobody has agreed what "reliable enough" actually means for this system.',
        icon: 'Target',
      },
      {
        title: 'Reactive Incident Response',
        description: 'Incidents are handled ad hoc, with no clear ownership or escalation path.',
        icon: 'AlertTriangle',
      },
      {
        title: 'Reliability vs. Feature Work Debates',
        description: 'Every sprint, reliability work loses out to new features with no data to inform the trade-off.',
        icon: 'Gauge',
      },
      {
        title: 'Untested Disaster Recovery',
        description: 'A DR plan exists on paper but has never actually been rehearsed.',
        icon: 'LifeBuoy',
      },
    ],
    capabilities: [
      {
        title: 'SLI, SLO & SLA Planning',
        description: 'Define meaningful reliability indicators, objectives and the error budget they create.',
        icon: 'Target',
      },
      {
        title: 'Reliability Monitoring',
        description: 'Monitor important service and infrastructure signals against defined targets.',
        icon: 'Activity',
      },
      {
        title: 'Incident Response',
        description: 'Create practical processes for detecting, responding to and learning from incidents.',
        icon: 'AlertTriangle',
      },
      {
        title: 'Capacity Planning',
        description: 'Understand infrastructure capacity and future workload requirements.',
        icon: 'Gauge',
      },
      {
        title: 'Disaster Prevention & Recovery',
        description: 'Improve failure-handling patterns and recovery planning, tested rather than assumed.',
        icon: 'LifeBuoy',
      },
      {
        title: 'Operational Automation',
        description: 'Automate repetitive operational work to reduce toil and human error.',
        icon: 'Zap',
      },
    ],
    technologies: [
      { group: 'Observability', items: ['Prometheus', 'Grafana', 'AWS CloudWatch'] },
      { group: 'Containers', items: ['Kubernetes'] },
      { group: 'Automation', items: ['Terraform'] },
    ],
    process: [
      { title: 'Assess', description: 'Review current reliability posture.' },
      { title: 'Measure', description: 'Define SLIs, SLOs and error budgets.' },
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
    useCases: [
      'Defining SLOs for a customer-facing application for the first time',
      'Building an incident response process where none formally exists',
      'Capacity planning ahead of an expected traffic increase',
      'Testing disaster recovery procedures that have never been rehearsed',
      'Reducing operational toil through automation',
    ],
    businessValue: [
      { title: 'Clearer Reliability Targets', description: 'Defined SLIs and SLOs guide priorities.' },
      { title: 'Faster Incident Response', description: 'Practical processes for detecting and responding to issues.' },
      { title: 'Better Capacity Foresight', description: 'Planning based on real workload growth.' },
      { title: 'Stronger Recovery Readiness', description: 'Disaster recovery planning kept current and tested.' },
    ],
    faqs: [
      {
        question: "What's the difference between SLI, SLO and SLA?",
        answer:
          'An SLI (Service Level Indicator) is a specific measured metric, like the percentage of requests served under 300ms. An SLO (Objective) is your internal target for that indicator, like 99.9% over 30 days. An SLA (Agreement) is a customer-facing commitment, often with consequences if missed. We help define SLIs and SLOs first — SLAs are a business decision built on top of those.',
      },
      {
        question: 'Can you guarantee 99.9% or 99.99% uptime for our system?',
        answer:
          'No — we will not promise a specific uptime percentage unless it is backed by your actual historical data and a realistic engineering plan to sustain it. We help you define achievable targets based on your system and investment level, not a marketing number.',
      },
      {
        question: 'Do you provide on-call or incident response coverage?',
        answer:
          "We help design the incident response process — ownership, escalation, communication — and can support live incidents as part of a Managed Cloud engagement. The exact coverage model depends on what you need.",
      },
      {
        question: 'Is SRE the same as DevOps?',
        answer:
          'They overlap but have different emphases. DevOps is broadly about delivery — getting code to production efficiently. SRE is specifically about defining and engineering toward reliability targets once systems are in production.',
      },
    ],
    cta: { heading: "Let's Build More Reliable Production Systems." },
    relatedServices: ['observability-monitoring', 'cloud-security', 'managed-cloud'],
    seo: {
      title: 'Site Reliability Engineering Services | Isha Technologies',
      description:
        'Site reliability engineering — SLI/SLO/SLA planning, incident response, capacity planning, disaster recovery and operational automation.',
    },
  },

  // ============================================================
  // AI & SECURITY
  // ============================================================

  // 12 — AI-Powered DevOps & AIOps
  {
    slug: 'ai-powered-devops-aiops',
    title: 'AI-Powered DevOps & AIOps',
    category: 'AI & Security',
    eyebrow: 'AI-ASSISTED OPERATIONS',
    heading: 'AI-Assisted Investigation, Not Unsupervised Automation',
    description:
      'We help teams use AI to speed up incident investigation, log analysis and alert triage — an assistant that correlates signals and suggests next steps alongside your engineers, not a replacement for their judgment.',
    overview: {
      heading: 'Where AI Genuinely Helps SRE and DevOps Workflows',
      paragraphs: [
        'AIOps — applying AI/ML techniques to operations data — is most useful where there is a lot of signal to sift through quickly: correlating an alert with recent deploys and related service errors, summarizing a wall of log lines into a likely cause, or flagging a metric that looks abnormal against its historical pattern.',
        "We are deliberate about the boundary: AI assists a human investigation — surfacing correlations and suggesting a starting point — it does not autonomously change production infrastructure. That distinction matters for both safety and trust in the tooling.",
      ],
    },
    problems: [
      {
        title: 'Alert Fatigue',
        description: 'Too many alerts fire with too little context, so real issues get lost in the noise.',
        icon: 'BellRing',
      },
      {
        title: 'Slow Root-Cause Investigation',
        description: 'Finding the cause of an incident means manually correlating metrics, logs and recent deploys.',
        icon: 'Search',
      },
      {
        title: 'Log Volume Too Large to Read Manually',
        description: 'Production log volume has grown well past what an engineer can scan during an incident.',
        icon: 'FileText',
      },
      {
        title: 'Tribal Knowledge, Not Documented Process',
        description: 'Only one or two engineers know how to investigate certain classes of incidents.',
        icon: 'Users',
      },
    ],
    capabilities: [
      {
        title: 'AI-Assisted Incident Analysis',
        description: 'Correlate alerts with recent deploys, related errors and infrastructure changes.',
        icon: 'Search',
      },
      {
        title: 'Intelligent Log Analysis',
        description: 'Summarize and surface the log entries most likely relevant to an active incident.',
        icon: 'FileText',
      },
      {
        title: 'Alert Analysis & Triage',
        description: 'Group and prioritize alerts so engineers see the signal, not the noise.',
        icon: 'BellRing',
      },
      {
        title: 'Anomaly Detection',
        description: 'Flag metrics that deviate from historical patterns, where the underlying data supports it.',
        icon: 'Activity',
      },
      {
        title: 'AI-Assisted Troubleshooting',
        description: 'Give engineers a starting hypothesis for investigation instead of a blank dashboard.',
        icon: 'Lightbulb',
      },
      {
        title: 'AI-Assisted DevOps Workflows',
        description: 'Apply AI assistance to code review, deployment risk assessment and operational documentation.',
        icon: 'Workflow',
      },
    ],
    technologies: [
      { group: 'Observability Foundation', items: ['Prometheus', 'Grafana', 'AWS CloudWatch', 'ELK Stack'] },
      { group: 'Platform', items: ['Kubernetes'] },
      { group: 'Automation', items: ['Terraform'] },
    ],
    process: [
      { title: 'Assess', description: 'Review current observability data and incident process.' },
      { title: 'Integrate', description: 'Connect AI-assisted analysis to existing signals.' },
      { title: 'Correlate', description: 'Tune correlation between alerts, deploys and logs.' },
      { title: 'Assist', description: 'Surface AI-generated hypotheses to on-call engineers.' },
      { title: 'Review', description: 'Validate AI suggestions against real incident outcomes.' },
      { title: 'Improve', description: 'Refine based on what actually helps investigations.' },
    ],
    architecture: [
      { label: 'Metrics/Logs/Traces', icon: 'LineChart' },
      { label: 'Correlation Engine', icon: 'GitMerge' },
      { label: 'AI Analysis', icon: 'Lightbulb' },
      { label: 'Engineer', icon: 'Users' },
      { label: 'Investigation', icon: 'Search' },
      { label: 'Resolution', icon: 'CheckCircle2' },
    ],
    useCases: [
      'Speeding up root-cause investigation during incidents',
      'Reducing alert noise through AI-assisted grouping and triage',
      'Summarizing large log volumes during an active incident',
      'Documenting incident investigation steps for less-experienced on-call engineers',
      'Flagging anomalous metrics before they become customer-facing issues',
    ],
    businessValue: [
      { title: 'Faster Investigation', description: 'AI-assisted correlation gives engineers a starting point, not a blank dashboard.' },
      { title: 'Reduced Alert Noise', description: 'Triage surfaces what matters instead of every threshold crossing.' },
      { title: 'Shared Investigative Context', description: 'Less reliance on one or two engineers who "just know" the system.' },
      { title: 'Human Judgment Stays in the Loop', description: 'AI assists the decision; engineers still make it.' },
    ],
    faqs: [
      {
        question: 'Does AI automatically fix incidents for us?',
        answer:
          'No — and we are direct about this. AI-assisted DevOps in this context means faster analysis and correlation of signals to help your engineers investigate; it does not mean unsupervised automation making changes to production infrastructure. Human judgment stays in the loop.',
      },
      {
        question: 'What data do you need for anomaly detection to work well?',
        answer:
          'A meaningful history of normal operating behavior — weeks of metrics, not hours. Anomaly detection without enough historical baseline tends to produce false positives, so we assess your existing observability data before proposing this specifically.',
      },
      {
        question: 'Is this the same as generic AIOps platforms we might buy off the shelf?',
        answer:
          "We integrate AI-assisted analysis into the observability stack you already have — Prometheus, Grafana, CloudWatch, ELK — rather than requiring a wholesale platform replacement. The goal is augmenting your existing SRE workflow, not replacing your tooling.",
      },
      {
        question: 'How do you avoid AI suggesting the wrong root cause?',
        answer:
          "AI-generated hypotheses are presented as a starting point for investigation, not a final answer — engineers validate before acting. We also review AI suggestions against real incident outcomes over time to see whether they're actually helping.",
      },
    ],
    cta: { heading: "Let's Bring AI-Assisted Investigation to Your Operations." },
    relatedServices: ['observability-monitoring', 'site-reliability-engineering', 'devops-solutions'],
    seo: {
      title: 'AI-Powered DevOps & AIOps Services | Isha Technologies',
      description:
        'AI-assisted incident analysis, intelligent log analysis and alert triage for DevOps and SRE teams — AI that assists investigation, not unsupervised automation.',
    },
  },

  // 13 — AI Cloud Infrastructure
  {
    slug: 'ai-cloud-infrastructure',
    title: 'AI Cloud Infrastructure',
    category: 'AI & Security',
    eyebrow: 'INFRASTRUCTURE FOR AI WORKLOADS',
    heading: 'Cloud Infrastructure Built for AI and Model Workloads',
    description:
      'We design cloud infrastructure for AI workloads — scalable compute, containerized model serving and Kubernetes-based orchestration — built and monitored with the same operational discipline as any other production system.',
    overview: {
      heading: 'AI Workloads Are Still Infrastructure Workloads',
      paragraphs: [
        'AI and model-serving workloads have real infrastructure requirements — compute sizing, containerization, scaling behavior and monitoring — that are distinct from a typical web application, but the underlying discipline is the same: design the environment deliberately, automate it as code, and monitor it properly.',
        'We build the cloud infrastructure layer around AI workloads: containerized model serving on Kubernetes, scalable compute sized to actual inference or training load, and monitoring that tracks the metrics that matter for these workloads specifically — not just generic CPU and memory.',
      ],
    },
    problems: [
      {
        title: 'Model Serving Infrastructure Built Ad Hoc',
        description: 'A model is deployed on whatever compute was available, with no real scaling or reliability plan.',
        icon: 'Server',
      },
      {
        title: 'Unpredictable Inference Costs',
        description: 'Compute for AI workloads is provisioned without a clear cost or capacity plan.',
        icon: 'Gauge',
      },
      {
        title: 'No Monitoring for Model-Serving Workloads',
        description: 'Standard infrastructure monitoring does not capture inference latency, throughput or failure patterns.',
        icon: 'Activity',
      },
      {
        title: 'Containerization Gaps',
        description: 'AI workloads run outside a proper container/orchestration setup, making them hard to scale or move.',
        icon: 'Container',
      },
    ],
    capabilities: [
      {
        title: 'Infrastructure for AI Workloads',
        description: 'Design cloud infrastructure sized and structured for model training or inference workloads.',
        icon: 'Server',
      },
      {
        title: 'Scalable Compute',
        description: 'Provision compute that scales with actual inference or training demand.',
        icon: 'Gauge',
      },
      {
        title: 'Containerized AI Workloads',
        description: 'Package model-serving applications into consistent, portable containers.',
        icon: 'Container',
      },
      {
        title: 'Kubernetes for AI Workloads',
        description: 'Orchestrate containerized AI workloads on Kubernetes for scaling and reliability.',
        icon: 'Boxes',
      },
      {
        title: 'Model Serving Infrastructure',
        description: 'Build the deployment and networking layer that serves models to applications reliably.',
        icon: 'Ship',
      },
      {
        title: 'AI Workload Monitoring',
        description: 'Track inference latency, throughput and resource usage specific to AI workloads.',
        icon: 'LineChart',
      },
    ],
    technologies: [
      { group: 'Cloud', items: ['AWS', 'Microsoft Azure', 'Google Cloud'] },
      { group: 'Cloud-Native', items: ['Kubernetes', 'Docker', 'Amazon EKS'] },
      { group: 'Observability', items: ['Prometheus', 'Grafana', 'AWS CloudWatch'] },
      { group: 'Automation', items: ['Terraform'] },
    ],
    process: [
      { title: 'Assess', description: 'Review the AI workload\'s compute and serving requirements.' },
      { title: 'Design', description: 'Plan infrastructure sized to the actual workload profile.' },
      { title: 'Containerize', description: 'Package the model-serving application for portability.' },
      { title: 'Deploy', description: 'Orchestrate on Kubernetes with appropriate scaling.' },
      { title: 'Monitor', description: 'Track inference-specific performance signals.' },
      { title: 'Optimize', description: 'Tune compute allocation and cost as usage patterns emerge.' },
    ],
    architecture: [
      { label: 'Requests', icon: 'Waypoints' },
      { label: 'Load Balancer', icon: 'Network' },
      { label: 'Model Serving', icon: 'Ship' },
      { label: 'Container Orchestration', icon: 'Boxes' },
      { label: 'Compute', icon: 'Server' },
      { label: 'Monitoring', icon: 'Activity' },
    ],
    useCases: [
      'Deploying a model-serving API into production infrastructure',
      'Containerizing an AI workload that currently runs on a single server',
      'Scaling inference infrastructure to handle variable demand',
      'Monitoring specifically for inference latency and throughput',
      'Cost-efficient compute planning for AI workloads',
    ],
    businessValue: [
      { title: 'Production-Grade AI Infrastructure', description: 'AI workloads run with the same discipline as any other production system.' },
      { title: 'Demand-Matched Compute', description: 'Scaling tied to actual inference or training load.' },
      { title: 'Workload-Specific Visibility', description: 'Monitoring that tracks what actually matters for AI workloads.' },
      { title: 'Portable, Containerized Deployments', description: 'Model-serving workloads that are easier to move and scale.' },
    ],
    faqs: [
      {
        question: 'Do you provide GPU infrastructure?',
        answer:
          "We provision GPU-backed compute where a cloud provider genuinely supports it for your target region and instance family — we will not claim GPU capabilities we have not actually set up and verified for your specific workload. We confirm this during the assessment before committing to it.",
      },
      {
        question: 'Do you build or train the AI models themselves?',
        answer:
          'No — this service is about the infrastructure layer: compute, containerization, orchestration and monitoring for AI workloads. Model development and training itself is outside our scope; we build the platform the models run on.',
      },
      {
        question: 'Can you help scale an existing AI workload we already have deployed?',
        answer:
          "Yes. This is common — a model was deployed to get something working, and now it needs to handle more traffic reliably. We assess the current setup and redesign the infrastructure layer around actual demand.",
      },
      {
        question: 'How is this different from AI-Powered DevOps & AIOps?',
        answer:
          "AI Cloud Infrastructure is about building infrastructure FOR AI workloads (serving models, running inference). AI-Powered DevOps & AIOps is about USING AI to help operate infrastructure and investigate incidents. They're complementary but address different needs.",
      },
    ],
    cta: { heading: "Let's Build Infrastructure for Your AI Workloads." },
    relatedServices: ['cloud-solutions', 'kubernetes-container-platforms', 'ai-powered-devops-aiops'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure'],
    seo: {
      title: 'AI Cloud Infrastructure Services | Isha Technologies',
      description:
        'Cloud infrastructure for AI workloads — scalable compute, containerized model serving and Kubernetes orchestration, monitored with production discipline.',
    },
  },

  // 14 — Cloud Security
  {
    slug: 'cloud-security',
    title: 'Cloud Security',
    category: 'AI & Security',
    eyebrow: 'INFRASTRUCTURE & CLOUD SECURITY',
    heading: 'Security Built Into Your Cloud Infrastructure',
    description:
      'We assess and strengthen cloud security posture — identity and access management, network security, secrets management and audit visibility — across AWS, Microsoft Azure and Google Cloud environments.',
    overview: {
      heading: 'Infrastructure Security, Not Just Pipeline Security',
      paragraphs: [
        'Cloud security spans more than the delivery pipeline — it includes how identity is managed, how networks are segmented, how secrets are stored, and how audit trails are kept for investigation. This is a different layer than DevSecOps, which focuses specifically on securing the CI/CD pipeline itself.',
        'We focus on the infrastructure layer specifically: reviewing what exists today, closing the gaps that matter most, and setting up the visibility to notice problems quickly if they do occur.',
      ],
    },
    problems: [
      {
        title: 'Overly Broad Access',
        description: 'IAM permissions accumulated over time with nobody reviewing what is actually still needed.',
        icon: 'KeyRound',
      },
      {
        title: 'Flat Network Architecture',
        description: 'No real segmentation, so a breach in one area can reach everything else.',
        icon: 'Network',
      },
      {
        title: 'Secrets Stored Insecurely',
        description: 'Credentials live in config files or environment variables instead of a proper secrets manager.',
        icon: 'Lock',
      },
      {
        title: 'No Audit Trail',
        description: 'API and console activity is not logged, so investigating a suspected incident is guesswork.',
        icon: 'Search',
      },
    ],
    capabilities: [
      {
        title: 'IAM & Access Control',
        description: 'Review identity, roles and permissions for least-privilege access.',
        icon: 'KeyRound',
      },
      {
        title: 'Network Security',
        description: 'Design network boundaries so a breach in one area stays contained.',
        icon: 'Network',
      },
      {
        title: 'Secrets Management',
        description: 'Move credentials out of code and config into a proper secrets manager.',
        icon: 'Lock',
      },
      {
        title: 'Container Security',
        description: 'Apply security practices to container images and runtime configuration.',
        icon: 'Container',
      },
      {
        title: 'Security Monitoring & Audit Logging',
        description: 'Ensure API and console activity is logged and reviewable after the fact.',
        icon: 'Search',
      },
      {
        title: 'Compliance Support',
        description: 'Align infrastructure controls with compliance frameworks genuinely relevant to your business.',
        icon: 'ClipboardList',
      },
    ],
    technologies: [
      { group: 'Identity', items: ['IAM', 'SSO / Identity Providers'] },
      { group: 'Network', items: ['Security Groups', 'Network ACLs', 'VPC'] },
      { group: 'Secrets & Data', items: ['Secrets Management', 'Encryption at Rest/Transit'] },
      { group: 'Visibility', items: ['CloudTrail', 'AWS CloudWatch', 'Audit Logging'] },
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
      { label: 'Secrets', icon: 'Lock' },
      { label: 'Workloads', icon: 'Server' },
      { label: 'Audit Trail', icon: 'Search' },
      { label: 'Alerts', icon: 'BellRing' },
    ],
    useCases: [
      'Pre-audit or pre-compliance-review security assessment',
      'Reviewing IAM permissions accumulated over years',
      'Moving hardcoded secrets into a proper secrets manager',
      'Establishing network segmentation for a flat architecture',
      'Setting up audit logging where none currently exists',
    ],
    businessValue: [
      { title: 'Reduced Attack Surface', description: 'Fewer exposed paths into production infrastructure.' },
      { title: 'Least-Privilege Access', description: 'Identity and permissions scoped to what is actually needed.' },
      { title: 'Stronger Compliance Readiness', description: 'Controls aligned with frameworks relevant to your business.' },
      { title: 'Faster Incident Detection', description: 'Audit logging and monitoring in place before an incident.' },
    ],
    faqs: [
      {
        question: "What's the difference between Cloud Security and DevSecOps?",
        answer:
          'DevSecOps secures the delivery pipeline — code scanning, dependency checks, secrets in CI/CD. Cloud Security addresses the infrastructure itself — IAM, network segmentation, encryption, audit logging. Many clients need both; they cover different layers of the same overall security posture.',
      },
      {
        question: 'Do you have formal security compliance certifications?',
        answer:
          "We help align your infrastructure controls with what compliance frameworks genuinely require, but we do not hold or claim formal compliance certifications for Isha Technologies itself unless that changes — we will always be direct about what we actually have.",
      },
      {
        question: 'Can you help us pass a security audit or customer security review?',
        answer:
          'Yes, this is a common reason clients come to us — we review your current posture against what auditors or enterprise customers typically ask for, and prioritize closing the gaps that matter most before the review.',
      },
      {
        question: 'How long does a cloud security assessment take?',
        answer:
          "A focused assessment of a single AWS/Azure/GCP account typically takes one to a few weeks depending on environment size and complexity — we'll scope this properly after an initial conversation about your environment.",
      },
    ],
    cta: { heading: "Let's Strengthen Your Cloud Security Posture." },
    relatedServices: ['devsecops', 'cloud-solutions', 'site-reliability-engineering'],
    platforms: ['AWS', 'Google Cloud', 'Microsoft Azure'],
    seo: {
      title: 'Cloud Security Services | Isha Technologies',
      description:
        'Cloud security services — IAM and access control, network security, secrets management, audit logging and compliance support across AWS, Azure and Google Cloud.',
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

/** Groups services by their display category, in category-declaration
 * order — used by the Explore All Services page and the navigation menu
 * so both stay in sync with the same underlying data automatically. */
export function getServicesByCategory(): { category: Service['category']; services: Service[] }[] {
  const categoryOrder: Service['category'][] = [
    'Cloud & Infrastructure',
    'DevOps & Platform',
    'Cloud-Native',
    'AI & Security',
  ];
  return categoryOrder.map((category) => ({
    category,
    services: services.filter((service) => service.category === category),
  }));
}
