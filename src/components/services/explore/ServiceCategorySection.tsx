import { iconMap } from '@/data/icon-map';
import type { IconName } from '@/data/icon-map';
import type { Service } from '@/types/types';
import { ServiceCard } from './ServiceCard';

const CATEGORY_META: Record<
  Service['category'],
  { anchor: string; icon: IconName; description: string }
> = {
  'Cloud & Infrastructure': {
    anchor: 'cloud-infrastructure',
    icon: 'Cloud',
    description:
      'Foundational cloud architecture, migration and cost efficiency — the infrastructure layer everything else in your stack runs on.',
  },
  'DevOps & Platform': {
    anchor: 'devops-platform',
    icon: 'Workflow',
    description:
      'Delivery automation, secure pipelines and internal platforms that make shipping software repeatable and less error-prone.',
  },
  'Cloud-Native': {
    anchor: 'cloud-native',
    icon: 'Boxes',
    description:
      'Kubernetes, observability and reliability engineering for systems built to run at scale, in production, continuously.',
  },
  'AI & Security': {
    anchor: 'ai-security',
    icon: 'ShieldCheck',
    description:
      'AI-assisted operations, infrastructure for AI workloads, and security built into the cloud layer rather than bolted on.',
  },
};

export function ServiceCategorySection({
  category,
  services,
  index,
}: {
  category: Service['category'];
  services: Service[];
  index: number;
}) {
  const meta = CATEGORY_META[category];
  const Icon = iconMap[meta.icon];

  return (
    <section
      id={meta.anchor}
      className={`scroll-mt-24 py-16 ${index % 2 === 0 ? 'bg-white' : 'bg-brand/[0.03]'}`}
    >
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-10 flex max-w-2xl items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-brand">
              {category}
            </span>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{meta.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, idx) => (
            <ServiceCard key={service.slug} service={service} delay={idx * 0.06} />
          ))}
        </div>
      </div>
    </section>
  );
}
