import { Activity, CircleCheck, ShieldCheck, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Principle = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const PRINCIPLES: Principle[] = [
  {
    number: '01',
    title: 'Reliability',
    description:
      'Systems should remain dependable under real-world conditions, not just during deployment.',
    icon: Activity,
  },
  {
    number: '02',
    title: 'Security',
    description:
      'Security is built into infrastructure, delivery and access from the beginning.',
    icon: ShieldCheck,
  },
  {
    number: '03',
    title: 'Automation',
    description:
      'We replace repetitive operations with consistent, repeatable engineering workflows.',
    icon: Workflow,
  },
  {
    number: '04',
    title: 'Ownership',
    description:
      'We take responsibility for the systems we build and the outcomes they enable.',
    icon: CircleCheck,
  },
];

// Compact, premium principle cards for the About page "How We Work"
// section. Neutral at rest; border, number and icon shift to the brand
// blue together on hover for one cohesive, subtle interaction.
export function EngineeringPrinciples() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
      {PRINCIPLES.map((principle) => {
        const Icon = principle.icon;
        return (
          <div
            key={principle.number}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:border-brand hover:bg-brand/[0.04] hover:shadow-md md:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold tracking-wide text-brand/60 transition-colors duration-300 ease-out group-hover:text-brand">
                {principle.number}
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition-colors duration-300 ease-out group-hover:bg-brand/10 group-hover:text-brand">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-black">
              {principle.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
              {principle.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
