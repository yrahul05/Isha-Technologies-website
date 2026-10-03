import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { humanize, initials } from '@/lib/portal/format';

/**
 * Portal presentation primitives. Every token here is lifted from the
 * public site so the portal reads as the same product:
 *   cards      → rounded-2xl, border-gray-200, white, `card-hover` glow
 *   icon chips → bg-brand/10 text-brand (services visual `VisualNode`)
 *   eyebrow    → text-xs font-semibold uppercase tracking-wide text-brand
 *   headings   → slate-900, bold, tight tracking
 */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 motion-safe:animate-hero-rise">
        {eyebrow && <span className="text-xs font-semibold uppercase tracking-wide text-brand">{eyebrow}</span>}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  interactive = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  interactive?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        interactive && 'card-hover',
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function IconChip({ icon: Icon, tone = 'brand', size = 'md' }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'card-accent-bg flex shrink-0 items-center justify-center rounded-xl',
        size === 'md' ? 'h-10 w-10' : 'h-8 w-8 rounded-lg',
        TONE_CHIP[tone]
      )}
    >
      <Icon className={size === 'md' ? 'h-[18px] w-[18px]' : 'h-4 w-4'} strokeWidth={1.75} />
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  href,
  trend,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string; good?: boolean };
}) {
  const body = (
    <div className="flex items-start gap-3.5">
      <IconChip icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-[1.45rem] font-bold leading-tight tracking-tight text-slate-900 tabular-nums">{value}</p>
        {(hint || trend) && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {trend && (
              <span
                className={cn(
                  'font-semibold',
                  trend.good === undefined ? 'text-slate-600' : trend.good ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.label}
              </span>
            )}
            {hint}
          </p>
        )}
      </div>
    </div>
  );
  const cls = 'block rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
  return href ? (
    <Link href={href} className={cn(cls, 'card-hover focus-visible:outline-none')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export type Tone = 'brand' | 'green' | 'amber' | 'red' | 'slate' | 'violet' | 'sky';

const TONE_CHIP: Record<Tone, string> = {
  brand: 'bg-brand/10 text-brand',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
  violet: 'bg-violet-50 text-violet-600',
  sky: 'bg-sky-50 text-sky-600',
};

const TONE_BADGE: Record<Tone, string> = {
  brand: 'bg-brand/10 text-brand ring-brand/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
};

/** One mapping for every status/priority enum in the system. */
const STATUS_TONE: Record<string, Tone> = {
  // projects
  planning: 'violet', active: 'brand', on_hold: 'slate', at_risk: 'amber', completed: 'green', cancelled: 'slate',
  on_track: 'green', off_track: 'red',
  // tasks
  todo: 'slate', in_progress: 'brand', review: 'violet', blocked: 'red',
  // invoices
  draft: 'slate', sent: 'sky', partially_paid: 'amber', paid: 'green', overdue: 'red',
  // tickets
  open: 'sky', waiting_for_client: 'amber', resolved: 'green', closed: 'slate',
  // meetings / approvals / leads
  scheduled: 'brand', requested: 'amber', pending: 'amber', approved: 'green', rejected: 'red', archived: 'slate',
  new: 'sky', contacted: 'brand', qualified: 'violet', proposal_sent: 'amber', negotiation: 'amber', won: 'green', lost: 'slate',
  // priority
  low: 'slate', medium: 'sky', high: 'amber', urgent: 'red', normal: 'sky',
  // clients / users
  inactive: 'slate', onboarding: 'violet', available: 'green', busy: 'amber', on_leave: 'violet',
  internal: 'slate', client: 'brand',
  // proposals / contracts / renewals
  viewed: 'violet', accepted: 'green', converted: 'brand', expired: 'red', terminated: 'red', renewed: 'green', lapsed: 'red',
};

export function toneFor(status: string): Tone {
  return STATUS_TONE[status] ?? 'slate';
}

export function Badge({ children, tone = 'slate', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        TONE_BADGE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = toneFor(status);
  return (
    <Badge tone={tone}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[tone])} aria-hidden />
      {label ?? humanize(status)}
    </Badge>
  );
}

const DOT: Record<Tone, string> = {
  brand: 'bg-brand', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500',
  slate: 'bg-slate-400', violet: 'bg-violet-500', sky: 'bg-sky-500',
};

export function Avatar({ name, size = 'md', className, src }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string; src?: string | null }) {
  const sizes = { xs: 'h-6 w-6 text-[10px]', sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-14 w-14 text-base' };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- authenticated same-origin route, not optimisable
    return <img src={src} alt={name} title={name} className={cn('inline-block shrink-0 rounded-full object-cover ring-2 ring-white', sizes[size], className)} />;
  }
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand/60 font-semibold text-white ring-2 ring-white',
        sizes[size],
        className
      )}
    >
      {initials(name) || '?'}
    </span>
  );
}

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  return (
    <div className="flex -space-x-2">
      {shown.map((n) => (
        <Avatar key={n} name={n} size="sm" />
      ))}
      {names.length > max && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white">
          +{names.length - max}
        </span>
      )}
    </div>
  );
}

export function ProgressBar({ value, tone = 'brand', className }: { value: number; tone?: Tone; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const fill: Record<Tone, string> = {
    brand: 'from-brand/70 to-brand', green: 'from-emerald-400 to-emerald-500', amber: 'from-amber-400 to-amber-500',
    red: 'from-rose-400 to-rose-500', slate: 'from-slate-300 to-slate-400', violet: 'from-violet-400 to-violet-500', sky: 'from-sky-400 to-sky-500',
  };
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-slate-100', className)}
    >
      <div className={cn('h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out', fill[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl px-6 py-10 text-center">
      <DotGrid className="opacity-60" />
      <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <p className="relative mt-3 text-sm font-semibold text-slate-900">{title}</p>
      {description && <p className="relative mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="relative mt-4">{action}</div>}
    </div>
  );
}

/** The dotted brand grid used behind the site's hero visuals and footer. */
export function DotGrid({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}>
      <defs>
        <pattern id="portal-dot-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" className="fill-brand/10" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#portal-dot-grid)" />
    </svg>
  );
}

export function Tabs({ tabs, active }: { tabs: { href: string; label: string; count?: number; key: string }[]; active: string }) {
  return (
    <nav className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-gray-200 px-1 scroll-bar-hidden" aria-label="Sections">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              '-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-200',
              isActive ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-900'
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-[10px] font-semibold', isActive ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-500')}>
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-slate-800">{it.value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

// ─── Tables ──────────────────────────────────────────────────────────────
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('-mx-5 overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn('border-b border-gray-100 px-5 pb-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400', className)}>
      {children}
    </th>
  );
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('border-b border-gray-50 px-5 py-3 align-middle text-slate-700', className)}>{children}</td>;
}
export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn('transition-colors hover:bg-brand/[0.03]', className)}>{children}</tr>;
}

export function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-slate-700 hover:border-brand hover:text-brand" href={hrefFor(page - 1)}>
            Previous
          </Link>
        )}
        {page < pages && (
          <Link className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-slate-700 hover:border-brand hover:text-brand" href={hrefFor(page + 1)}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

export function Timeline({ items }: { items: { id: string; title: ReactNode; meta: ReactNode; tone?: Tone }[] }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">No activity yet.</p>;
  return (
    <ol className="relative space-y-4 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-gray-200">
      {items.map((it) => (
        <li key={it.id} className="relative pl-6">
          <span className={cn('absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ring-4 ring-white', DOT[it.tone ?? 'brand'])} />
          <p className="text-sm text-slate-800">{it.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{it.meta}</p>
        </li>
      ))}
    </ol>
  );
}
