'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, CheckCheck, Volume2 } from 'lucide-react';
import * as Popover from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { relativeTime } from '@/lib/portal/format';
import { markAllNotificationsRead, setNotificationRead } from '@/server/actions/notifications';

type Item = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  readAt: string | null;
  createdAt: string;
};

const SOUND_KEY = 'isha-portal-sound';
/** Types that always chime, regardless of priority. */
const IMPORTANT_TYPES = new Set(['task.assigned', 'meeting.scheduled', 'meeting.updated', 'ticket.created', 'change_request.created', 'invoice.overdue', 'announcement.emergency']);

/**
 * Soft two-note chime synthesised with Web Audio — no audio asset to load.
 * Browsers only allow audio after a user gesture, so the context is created
 * lazily and a failed/blocked play is silently ignored.
 */
let audioCtx: AudioContext | null = null;
function unlockAudio() {
  if (audioCtx || typeof window === 'undefined') return;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (Ctx) audioCtx = new Ctx();
}
function playChime() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') void audioCtx.resume().catch(() => undefined);
  const now = audioCtx.currentTime;
  [
    [880, 0],
    [1318.5, 0.12],
  ].forEach(([freq, offset]) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.45);
    osc.connect(gain).connect(audioCtx!.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.5);
  });
}

export function NotificationBell({ pollSeconds = 20, soundAllowed = true, initialUnread = 0 }: { pollSeconds?: number; soundAllowed?: boolean; initialUnread?: number }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [pulse, setPulse] = useState(false);
  const [, startTransition] = useTransition();

  // Everything that existed when the page loaded is "old": it never chimes.
  const baseline = useRef<number | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn && soundAllowed;

  useEffect(() => {
    try {
      setSoundOn(localStorage.getItem(SOUND_KEY) !== 'off');
    } catch {
      /* storage unavailable — keep default */
    }
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/notifications', { cache: 'no-store' });
      if (res.status === 401) {
        router.push('/portal/login');
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { unread: number; items: Item[]; serverTime: string };
      if (baseline.current === null) {
        baseline.current = new Date(data.serverTime).getTime();
        data.items.forEach((i) => seen.current.add(i.id));
      } else {
        const fresh = data.items.filter((i) => !seen.current.has(i.id) && new Date(i.createdAt).getTime() >= baseline.current! - 60_000);
        fresh.forEach((i) => seen.current.add(i.id));
        if (fresh.length) {
          setPulse(true);
          setTimeout(() => setPulse(false), 1600);
          const important = fresh.some((i) => i.priority === 'high' || i.priority === 'urgent' || IMPORTANT_TYPES.has(i.type));
          if (important && soundOnRef.current) playChime();
          router.refresh();
        }
      }
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* offline — try again next tick */
    }
  }, [router]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      await poll();
      // Poll at the configured rate while visible; back off hard when hidden.
      timer = setTimeout(tick, document.visibilityState === 'visible' ? pollSeconds * 1000 : pollSeconds * 6000);
    };
    void tick();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [poll, pollSeconds]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      /* ignore */
    }
    if (next) {
      unlockAudio();
      playChime();
    }
  };

  const markRead = (item: Item, read: boolean) => {
    setItems((all) => all.map((i) => (i.id === item.id ? { ...i, readAt: read ? new Date().toISOString() : null } : i)));
    setUnread((n) => Math.max(0, n + (read ? -1 : 1)));
    startTransition(() => setNotificationRead(item.id, read));
  };

  const markAll = () => {
    setItems((all) => all.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
    setUnread(0);
    startTransition(() => markAllNotificationsRead());
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-600 transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <Bell className={cn('h-[18px] w-[18px]', pulse && 'motion-safe:animate-[wiggle_0.8s_ease-in-out_2]')} strokeWidth={1.75} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
          {pulse && <span className="absolute inset-0 rounded-xl ring-2 ring-brand/50 motion-safe:animate-ping" aria-hidden />}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Overlay className="fixed inset-0 z-40 bg-slate-900/10 sm:bg-transparent" />
        <Popover.Content
          aria-describedby={undefined}
          className="fixed inset-x-3 top-[72px] z-50 flex max-h-[min(560px,calc(100vh-96px))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:left-auto sm:right-6 sm:w-[400px]"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <Popover.Title className="text-sm font-semibold text-slate-900">Notifications</Popover.Title>
            <div className="flex items-center gap-1">
              {soundAllowed && (
                <button onClick={toggleSound} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-brand" title={soundOn ? 'Mute sound' : 'Enable sound'}>
                  {soundOn ? <Volume2 className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </button>
              )}
              {unread > 0 && (
                <button onClick={markAll} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/5">
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>
          </div>
          <ul className="flex-1 divide-y divide-gray-50 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-500">You&rsquo;re all caught up.</li>}
            {items.map((item) => (
              <li key={item.id} className={cn('group relative flex gap-3 px-4 py-3 transition-colors hover:bg-brand/[0.03]', !item.readAt && 'bg-brand/[0.04]')}>
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', item.readAt ? 'bg-transparent' : item.priority === 'urgent' ? 'bg-rose-500' : 'bg-brand')} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={item.link || '/portal/notifications'}
                    onClick={() => {
                      if (!item.readAt) markRead(item, true);
                      setOpen(false);
                    }}
                    className="block text-sm font-medium text-slate-900 after:absolute after:inset-0 hover:text-brand"
                  >
                    {item.title}
                  </Link>
                  {item.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">{relativeTime(item.createdAt)}</p>
                </div>
                <button
                  onClick={() => markRead(item, !item.readAt)}
                  className="relative z-10 self-start rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 opacity-0 transition-opacity hover:text-brand focus-visible:opacity-100 group-hover:opacity-100"
                >
                  {item.readAt ? 'Unread' : 'Read'}
                </button>
              </li>
            ))}
          </ul>
          <Link href="/portal/notifications" onClick={() => setOpen(false)} className="border-t border-gray-100 px-4 py-2.5 text-center text-xs font-semibold text-brand hover:bg-brand/5">
            View notification history
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
