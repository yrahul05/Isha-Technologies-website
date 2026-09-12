/**
 * The full technology ecosystem shown in the "Technologies We Work With"
 * section on every service page. This is intentionally the same content
 * on every page — it represents the overall engineering capability of
 * Isha Technologies, not a per-service filtered list. Not every item is
 * used on every engagement.
 */

// Cloud platforms (AWS / Microsoft Azure / Google Cloud) are deliberately
// NOT listed here. This row represents open tools and technologies —
// cloud platforms get their own "Cloud Platforms" category below, and
// formal cloud partnerships (AWS Advanced Tier Services Partner, Google
// Cloud Partner, Microsoft Azure Partner) are represented separately on
// the homepage, never mixed in with generic technology chips.
export const CORE_TECHNOLOGIES: string[] = [
  'Kubernetes',
  'Docker',
  'Terraform',
  'Ansible',
  'GitHub Actions',
  'GitLab CI/CD',
  'Jenkins',
  'Prometheus',
  'Grafana',
  'CloudWatch',
  'Linux',
];

export type TechnologyCategory = {
  label: string;
  items: string[];
};

export const TECHNOLOGY_CATEGORIES: TechnologyCategory[] = [
  {
    label: 'Cloud Platforms',
    items: ['AWS', 'Microsoft Azure', 'Google Cloud', 'Hetzner', 'DigitalOcean', 'BigRock'],
  },
  {
    label: 'Containers & Orchestration',
    items: ['Docker', 'Kubernetes', 'Helm', 'Amazon EKS', 'Azure AKS', 'Google GKE'],
  },
  {
    label: 'Infrastructure as Code',
    items: ['Terraform', 'Ansible', 'CloudFormation'],
  },
  {
    label: 'CI/CD & Delivery',
    items: ['GitHub Actions', 'GitLab CI/CD', 'Jenkins', 'Azure DevOps'],
  },
  {
    label: 'Security & DevSecOps',
    items: ['IAM', 'RBAC', 'SAST', 'DAST', 'Secrets Management', 'Container Scanning'],
  },
  {
    label: 'Networking',
    items: ['VPC', 'VNet', 'Load Balancers', 'DNS', 'VPN', 'Firewalls'],
  },
  {
    label: 'Observability',
    items: ['Prometheus', 'Grafana', 'CloudWatch', 'Azure Monitor', 'Metrics', 'Logs', 'Traces'],
  },
  {
    label: 'Linux & Systems',
    items: ['Linux', 'Ubuntu', 'RHEL', 'Bash', 'SSH'],
  },
  {
    label: 'Platform Engineering',
    items: [
      'Internal Developer Platforms',
      'Golden Paths',
      'Infrastructure Templates',
      'Self-Service Infrastructure',
    ],
  },
  {
    label: 'Reliability',
    items: ['SLI', 'SLO', 'High Availability', 'Disaster Recovery', 'Incident Management'],
  },
  {
    label: 'Cloud Efficiency',
    items: ['Rightsizing', 'Resource Optimization', 'Cost Visibility', 'Capacity Planning'],
  },
  {
    label: 'Architecture',
    items: [
      'Cloud Architecture',
      'Network Architecture',
      'Microservices Infrastructure',
      'Production Infrastructure',
    ],
  },
];
