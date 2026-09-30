'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/server/actions/auth';
import { NAV_ICONS } from './icons';
import type { NavGroup } from './nav';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname() ?? '';
  return (
    <nav aria-label="Portal" className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = NAV_ICONS[item.icon];
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                      active ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-brand" aria-hidden />}
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-brand' : 'text-slate-400 group-hover:text-brand')} strokeWidth={1.75} />
                    <span className="truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="ml-auto rounded-full bg-brand px-1.5 py-px text-[10px] font-semibold text-white">{item.badge > 99 ? '99+' : item.badge}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ groups, workspaceLabel }: { groups: NavGroup[]; workspaceLabel: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-black/5 bg-white lg:flex">
      <div className="flex h-16 items-center border-b border-black/5 px-5">
        <Logo href="/portal/dashboard" src="/ISHA-TECHNO-LG.png" imgClassName="h-9 w-auto" />
      </div>
      <div className="px-4 pt-4">
        <div className="rounded-xl border border-brand/15 bg-gradient-to-br from-brand/[0.07] to-transparent px-3 py-2.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand">Workspace</p>
          <p className="truncate text-sm font-semibold text-slate-900">{workspaceLabel}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-5 scroll-bar-hidden">
        <SidebarNav groups={groups} />
      </div>
      <form action={logoutAction} className="border-t border-black/5 px-3 pt-3">
        <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600">
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} /> Sign out
        </button>
      </form>
      <div className="px-5 pb-3 pt-2 text-[11px] text-slate-400">
        <Link href="/" className="hover:text-brand">
          ishatechnologies.in
        </Link>{' '}
        · Build. Scale. Automate.
      </div>
    </aside>
  );
}
