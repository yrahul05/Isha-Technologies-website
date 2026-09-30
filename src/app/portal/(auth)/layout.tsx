import type { ReactNode } from 'react';
import { CalendarCheck2, FileLock2, LifeBuoy, ReceiptIndianRupee, ShieldCheck, Workflow } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { DotGrid } from '@/components/portal/ui';

const HIGHLIGHTS = [
  { icon: Workflow, label: 'Live project progress, tasks and timelines' },
  { icon: FileLock2, label: 'Private documents with version history' },
  { icon: ReceiptIndianRupee, label: 'Invoices and complete payment history' },
  { icon: CalendarCheck2, label: 'Meetings with Google Meet built in' },
  { icon: LifeBuoy, label: 'Support tickets with a full audit trail' },
];

/** Split-screen sign-in shell: brand gradient panel (as in the site's CTA banners) + form. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand via-brand/85 to-brand/40 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-40">
          <defs>
            <pattern id="auth-grid" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white" fillOpacity="0.35" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <p className="text-[13px] font-medium uppercase tracking-widest text-white/80">Isha Technologies</p>
          <h2 className="mt-4 max-w-md text-[2.4rem] font-semibold leading-[1.1] tracking-tighter">
            The engineering behind what&rsquo;s next &mdash; in one secure workspace.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
            Your projects, documents, invoices, meetings and support with Isha Technologies, visible only to the people
            you work with.
          </p>
        </div>

        <ul className="relative space-y-3">
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-white/90">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20 backdrop-blur">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              {label}
            </li>
          ))}
        </ul>

        <p className="relative flex items-center gap-2 text-xs text-white/75">
          <ShieldCheck className="h-4 w-4" /> Encrypted sessions · role-based access · every action audited
        </p>
      </aside>

      <main className="relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-white to-brand/5 px-5 py-12">
        <DotGrid className="opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="relative w-full max-w-[400px] motion-safe:animate-hero-rise">
          <Logo src="/ISHA-TECHNO-LG.png" imgClassName="h-10 w-auto" className="mb-8" priority />
          {children}
        </div>
      </main>
    </div>
  );
}
