'use client';

import Link from 'next/link';
import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronDown, LogOut, Menu, Settings, UserRound } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/ui/logo';
import { logoutAction } from '@/server/actions/auth';
import { Avatar } from '../ui';
import { CommandSearch } from './CommandSearch';
import { NotificationBell } from './NotificationBell';
import { SidebarNav } from './Sidebar';
import type { NavGroup } from './nav';

export function Topbar({
  groups,
  user,
  pollSeconds,
  soundAllowed,
  unread,
}: {
  groups: NavGroup[];
  user: { name: string; email: string; roleLabel: string; workspace: string; avatarUrl?: string | null };
  pollSeconds: number;
  soundAllowed: boolean;
  unread: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/85 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetTrigger asChild>
            <button aria-label="Open navigation" className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-slate-600 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] overflow-y-auto bg-white p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-16 items-center border-b border-black/5 px-5">
              <Logo href="/portal/dashboard" src="/ISHA-TECHNO-LG.png" imgClassName="h-9 w-auto" />
            </div>
            <div className="px-3 py-5">
              <SidebarNav groups={groups} onNavigate={() => setNavOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <CommandSearch />
        </div>

        <NotificationBell pollSeconds={pollSeconds} soundAllowed={soundAllowed} initialUnread={unread} />

        <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogPrimitive.Trigger asChild>
            <button className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
              <Avatar name={user.name} size="md" src={user.avatarUrl} />
              <span className="hidden text-left md:block">
                <span className="block max-w-[140px] truncate text-sm font-semibold leading-tight text-slate-900">{user.name}</span>
                <span className="block text-[11px] leading-tight text-slate-500">{user.roleLabel}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
            </button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-40" />
            <DialogPrimitive.Content
              aria-describedby={undefined}
              className="fixed right-3 top-[68px] z-50 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:right-6"
            >
              <DialogPrimitive.Title className="sr-only">Account</DialogPrimitive.Title>
              <div className="px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <p className="mt-1.5 inline-flex rounded-full border border-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">{user.workspace}</p>
              </div>
              <div className="my-1 h-px bg-gray-100" />
              <Link onClick={() => setMenuOpen(false)} href="/portal/settings" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-brand/5 hover:text-brand">
                <UserRound className="h-4 w-4" /> My account & security
              </Link>
              <Link onClick={() => setMenuOpen(false)} href="/portal/notifications" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-brand/5 hover:text-brand">
                <Settings className="h-4 w-4" /> Notification history
              </Link>
              <div className="my-1 h-px bg-gray-100" />
              <form action={logoutAction}>
                <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </form>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </header>
  );
}
