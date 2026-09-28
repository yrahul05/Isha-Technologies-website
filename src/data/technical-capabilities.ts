/**
 * The full technology ecosystem shown in the "Technologies We Work With"
 * section on the Explore All Services page (/services) only — individual
 * service pages show their own smaller, service-specific `technologies`
 * list instead (see Service.technologies in src/types/types.ts). This
 * file represents the overall engineering capability of Isha Technologies.
 * Not every item is used on every engagement.
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
    label: 'Cloud',
    items: ['AWS', 'Microsoft Azure', 'Google Cloud', 'DigitalOcean', 'Hetzner'],
  },
  {
    label: 'DevOps',
    items: ['Docker', 'Jenkins', 'GitHub Actions', 'Git', 'GitHub', 'GitLab'],
  },
  {
    label: 'Infrastructure as Code',
    items: ['Terraform', 'Ansible'],
  },
  {
    label: 'Cloud Native',
    items: ['Kubernetes', 'Amazon EKS'],
  },
  {
    label: 'Monitoring & Observability',
    items: ['Prometheus', 'Grafana', 'AWS CloudWatch', 'ELK Stack'],
  },
  {
    label: 'Security',
    items: ['IAM', 'Secrets Management', 'Container Security', 'DevSecOps Tooling'],
  },
];
