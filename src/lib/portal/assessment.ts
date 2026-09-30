/** Question bank for the public Free DevOps & Cloud Assessment (shared by the form and the API). */
export const ASSESSMENT = {
  clouds: ['AWS', 'Azure', 'Google Cloud', 'Multi-cloud', 'On-premises / data centre', 'Other'],
  infrastructure: ['EC2 / VMs', 'EKS / AKS / GKE (Kubernetes)', 'Docker / containers', 'Serverless (Lambda, Functions)', 'Managed databases', 'Terraform / IaC', 'CI/CD pipelines', 'Not sure'],
  spend: ['Under ₹1L / month', '₹1L – ₹5L', '₹5L – ₹20L', '₹20L – ₹1Cr', 'Over ₹1Cr', 'Not sure'],
  deployFrequency: ['Multiple times a day', 'Daily', 'Weekly', 'Monthly', 'Less than monthly', 'Manual / ad-hoc'],
  problems: ['Rising cloud costs', 'Slow or risky deployments', 'Outages & reliability', 'Security & compliance gaps', 'No monitoring / observability', 'Kubernetes complexity', 'Migration to cloud', 'Lack of in-house DevOps skills'],
  companySize: ['1–10', '11–50', '51–200', '201–1000', '1000+'],
} as const;
