// Isha Technologies technical resource categories. This is the taxonomy for
// /resources/blogs — independent of any external publication.
export const blogCategories = [
  'Cloud Infrastructure',
  'DevOps',
  'AWS',
  'Microsoft Azure',
  'Google Cloud',
  'Kubernetes',
  'Terraform & IaC',
  'CI/CD',
  'DevSecOps',
  'Cloud Security',
  'Cloud Cost Optimization',
  'Cloud Migration',
  'Observability',
  'Site Reliability',
  'Platform Engineering',
  'Linux & Infrastructure',
] as const;

export type BlogCategory = (typeof blogCategories)[number];
