/**
 * Explanatory copy for the "How It Works" section on blog posts and case
 * studies — one entry per diagram (keyed by the same slug used for
 * `ServiceHeroVisual`, see src/components/services/visuals/). Written to
 * describe what that specific diagram actually shows, not a generic
 * "architecture overview" caption repeated everywhere.
 */
export type HowItWorksCopy = {
  eyebrow: string;
  heading: string;
  description: string;
};

export const HOW_IT_WORKS_COPY: Record<string, HowItWorksCopy> = {
  'cloud-solutions': {
    eyebrow: 'How It Works',
    heading: 'How a Request Moves Through the Stack',
    description:
      'A request enters through a load balancer, reaches the application layer, and fans out to the services and database it depends on — with monitoring watching every hop. This is the core shape almost every cloud architecture builds on top of.',
  },
  'cloud-migration-modernization': {
    eyebrow: 'How It Works',
    heading: 'From Existing Infrastructure to a Validated Cloud Environment',
    description:
      'Migration moves through discovery (mapping what actually exists and depends on what), the move itself, validation against the original behavior, and a final optimization pass — never a single "lift and shift" step.',
  },
  'managed-cloud': {
    eyebrow: 'How It Works',
    heading: 'The Operational Loop Behind Day-to-Day Reliability',
    description:
      'Infrastructure is continuously monitored; when a signal crosses a threshold, an alert triggers a response, and the resulting fix feeds back into ongoing maintenance and optimization — a loop, not a one-time setup.',
  },
  'cloud-cost-optimization-finops': {
    eyebrow: 'How It Works',
    heading: 'From Raw Usage Data to Sustained Savings',
    description:
      'Usage data is analyzed to find rightsizing opportunities, those changes are applied, and the resulting efficiency is monitored continuously — so savings don’t quietly erode as workloads change.',
  },
  'devops-solutions': {
    eyebrow: 'How It Works',
    heading: 'The Path From a Commit to a Running Deployment',
    description:
      'Code moves through version control into a pipeline that builds, tests, scans and packages it into a container before deployment — with monitoring closing the loop back to the team that shipped it.',
  },
  devsecops: {
    eyebrow: 'How It Works',
    heading: 'Where Security Checks Sit in the Pipeline',
    description:
      'Static analysis, dependency scanning and container scanning run as pipeline stages — not a final gate — so a vulnerable dependency or exposed secret is caught before it ever reaches a deployed container.',
  },
  'platform-engineering': {
    eyebrow: 'How It Works',
    heading: 'How a Developer Reaches Production Through the Platform',
    description:
      'A developer’s request goes through the internal platform’s templates rather than directly against raw infrastructure — the platform absorbs the underlying complexity and produces a standard, production-ready deployment.',
  },
  'infrastructure-as-code-gitops': {
    eyebrow: 'How It Works',
    heading: 'How a Change Becomes Infrastructure',
    description:
      'A change lands as a pull request, a plan shows exactly what would happen, a human reviews it, and only then does it apply against real infrastructure state — every step visible before it takes effect.',
  },
  'kubernetes-container-platforms': {
    eyebrow: 'How It Works',
    heading: 'How Traffic Reaches a Pod',
    description:
      'Ingress routes external traffic to a Service, which load-balances across the Pods a Deployment is managing on top of the cluster’s Nodes — the layering that gives Kubernetes its self-healing and scaling behavior.',
  },
  'observability-monitoring': {
    eyebrow: 'How It Works',
    heading: 'How Metrics, Logs and Traces Come Together',
    description:
      'The three signal types are correlated around a shared identifier so an engineer can move from "something is wrong" to an insight and a response — rather than checking each signal in isolation.',
  },
  'site-reliability-engineering': {
    eyebrow: 'How It Works',
    heading: 'The Reliability Feedback Loop',
    description:
      'Traffic flows through the load balancer and application into the database, with monitoring watching the whole path — and feeding directly into incident response when something degrades.',
  },
  'ai-powered-devops-aiops': {
    eyebrow: 'How It Works',
    heading: 'Where AI Assists — and Where a Human Still Decides',
    description:
      'Metrics, logs and alerts feed an AI correlation step that produces a hypothesis, not a fix — the engineer still investigates and decides what to do. That boundary is deliberate, not a limitation of the diagram.',
  },
  'ai-cloud-infrastructure': {
    eyebrow: 'How It Works',
    heading: 'How Requests Reach a Served Model',
    description:
      'Requests are load-balanced into a Kubernetes-orchestrated model-serving layer that autoscales with demand, backed by compute that’s monitored the same way any other production workload would be.',
  },
  'cloud-security': {
    eyebrow: 'How It Works',
    heading: 'Identity In, Audit Trail Out',
    description:
      'Every path into the secured boundary starts with identity and access control; secrets and workloads live inside that boundary, and an audit trail outside it records what happened for later investigation.',
  },
};
