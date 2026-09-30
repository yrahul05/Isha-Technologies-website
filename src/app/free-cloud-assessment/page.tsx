import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Clock3, FileSearch, LineChart, ShieldCheck, Wallet } from 'lucide-react';
import { AssessmentForm } from '@/components/assessment/AssessmentForm';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ServiceFAQ } from '@/components/services/ServiceFAQ';
import { JsonLd } from '@/components/JsonLd';
import { absoluteUrl, buildMetadata, organizationReference } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Free DevOps & Cloud Assessment | Isha Technologies',
  description:
    'Free DevOps & cloud assessment from Isha Technologies: cost, security, reliability and delivery gaps across AWS, Azure and GCP, reviewed by an engineer.',
  path: '/free-cloud-assessment',
});

const OUTCOMES = [
  { icon: Wallet, title: 'Cloud cost review', body: 'Where spend is leaking — idle capacity, rightsizing, commitments and architecture choices.' },
  { icon: ShieldCheck, title: 'Security & compliance gaps', body: 'IAM, network exposure, secrets and logging checked against well-known benchmarks.' },
  { icon: LineChart, title: 'Reliability & observability', body: 'Single points of failure, alerting coverage and recovery readiness.' },
  { icon: FileSearch, title: 'Delivery pipeline audit', body: 'How code reaches production today, and what slows or endangers releases.' },
];

const FAQS = [
  {
    question: 'Is the assessment really free?',
    answer: 'Yes. The initial assessment and the follow-up call are free, with no obligation. If you want us to implement the recommendations, we will share a scoped proposal separately.',
  },
  {
    question: 'Do you need access to our cloud account?',
    answer: 'Not for the initial assessment — it is based on your answers and a conversation with an engineer. A deeper infrastructure audit with read-only access can follow if you choose.',
  },
  {
    question: 'Which clouds do you cover?',
    answer: 'AWS, Microsoft Azure and Google Cloud, including Kubernetes (EKS, AKS, GKE), containers, serverless, Terraform and CI/CD platforms.',
  },
  {
    question: 'How quickly will I hear back?',
    answer: 'A cloud engineer reviews every submission and contacts you within one business day.',
  },
];

export default function FreeCloudAssessmentPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Free DevOps & Cloud Assessment',
    serviceType: 'Cloud infrastructure and DevOps assessment',
    url: absoluteUrl('/free-cloud-assessment'),
    provider: organizationReference,
    areaServed: 'IN',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand/5">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-60">
          <defs>
            <pattern id="assessment-grid" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" className="fill-brand/10" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#assessment-grid)" />
        </svg>
        <div className="relative mx-auto grid max-w-[1280px] gap-10 px-4 py-12 md:py-16 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
          <div className="motion-safe:animate-hero-rise">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Free Cloud Assessment', href: '/free-cloud-assessment' },
              ]}
            />
            <span className="inline-flex rounded-full border border-brand bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">Free · 5 minutes</span>
            <h1 className="mt-4 text-3xl font-bold tracking-tighter text-slate-900 md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">Free DevOps &amp; Cloud Assessment</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
              Answer a few questions about your cloud, stack and delivery process. An Isha Technologies engineer reviews them and comes back with prioritised, practical recommendations.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
              {['Reviewed by a certified cloud engineer — not an automated score', 'Cost, security, reliability and delivery covered', 'No cloud access or credentials required'].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <Clock3 className="h-4 w-4 text-brand" /> Response within one business day
            </p>
          </div>
          <div>
            <AssessmentForm />
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1280px] px-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">What you get</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">A clear picture of where to improve first</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OUTCOMES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card-hover rounded-2xl border border-gray-200 bg-white p-5">
                <span className="card-accent-bg flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="card-accent mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-600">
            Prefer to talk first? <Link href="/contact" className="font-semibold text-brand hover:underline">Book a consultation</Link> or explore our{' '}
            <Link href="/services/cloud-cost-optimization-finops" className="font-semibold text-brand hover:underline">cloud cost optimization</Link> and{' '}
            <Link href="/services/devops-solutions" className="font-semibold text-brand hover:underline">DevOps</Link> services.
          </p>
        </div>
      </section>

      <ServiceFAQ faqs={FAQS} />
    </>
  );
}
