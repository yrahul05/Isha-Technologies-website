'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Shared building blocks for the 10 per-service hero visuals. Keeping the
 * vocabulary (canvas, node chip, connectors, traveling packet) identical
 * across every visual is what makes 10 different diagrams still read as
 * one consistent Isha Technologies visual system.
 *
 * Every animated piece checks `useReducedMotion()` itself, so a visual
 * built from these primitives automatically renders as a calm, static
 * diagram for prefers-reduced-motion users — no per-visual plumbing.
 */

export function VisualCanvas({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative mx-auto w-full max-w-[300px] select-none sm:max-w-[360px] md:max-w-[400px] ${className}`}
    >
      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full opacity-70">
        <defs>
          <pattern id="hero-visual-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" className="fill-brand/10" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#hero-visual-grid)" />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}

export function VisualNode({
  icon: Icon,
  label,
  delay = 0,
  pulse = true,
  emphasis = false,
  className = '',
}: {
  icon: LucideIcon;
  label: string;
  delay?: number;
  pulse?: boolean;
  emphasis?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: 'easeOut', delay }}
      className={`flex items-center gap-2 rounded-xl border bg-white px-2.5 py-1.5 shadow-sm ${
        emphasis ? 'border-brand/40' : 'border-gray-200'
      } ${className}`}
    >
      <motion.span
        animate={reduce || !pulse ? undefined : { scale: [1, 1.08, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay }}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
          emphasis ? 'bg-brand text-white' : 'bg-brand/10 text-brand'
        }`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </motion.span>
      <span className="max-w-[8rem] text-[11px] font-semibold leading-snug text-slate-700">{label}</span>
    </motion.div>
  );
}

/** Narrow icon-over-label node for tight multi-column layouts (e.g. migration). */
export function MiniNode({
  icon: Icon,
  label,
  delay = 0,
  pulse = false,
}: {
  icon: LucideIcon;
  label: string;
  delay?: number;
  pulse?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: 'easeOut', delay }}
      className="flex w-[68px] flex-col items-center gap-1 text-center"
    >
      <motion.span
        animate={reduce || !pulse ? undefined : { scale: [1, 1.08, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay }}
        className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10 text-brand"
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </motion.span>
      <span className="text-[8.5px] font-semibold leading-tight text-slate-600">{label}</span>
    </motion.div>
  );
}

/** Small icon-only satellite badge — used for secondary concepts orbiting a node. */
export function SatelliteBadge({
  icon: Icon,
  label,
  delay = 0,
  className = '',
}: {
  icon: LucideIcon;
  label: string;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded-lg border border-brand/20 bg-white shadow-sm ${className}`}
    >
      <motion.span
        animate={reduce ? undefined : { opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay }}
        className="flex text-brand/70"
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </motion.span>
    </motion.div>
  );
}

/**
 * Vertical connector with a slow traveling data packet.
 *
 * The packet element itself always renders (with the same `initial` on
 * server and client) — only its `animate` target branches on reduced
 * motion. `useReducedMotion()` can only resolve after mount, so
 * conditionally unmounting the element itself (`{!reduce && <el/>}`)
 * would make the client's first render diff from the server-rendered
 * tree and trigger a hydration error. Branching `animate`/`transition`
 * is safe because those values aren't part of the static SSR markup.
 */
export function VConnector({ delay = 0, height = 20 }: { delay?: number; height?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto w-px bg-brand/20" style={{ height }}>
      <motion.span
        className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand"
        initial={{ top: '0%', opacity: 0 }}
        animate={
          reduce
            ? { opacity: 0 }
            : { top: ['0%', '100%'], opacity: [0, 1, 1, 0] }
        }
        transition={{ duration: 1.6, repeat: reduce ? 0 : Infinity, ease: 'linear', delay, repeatDelay: 1.4 }}
      />
    </div>
  );
}

/** Horizontal connector with a slow traveling data packet. Same reduced-motion approach as `VConnector`. */
export function HConnector({ delay = 0, width = 20 }: { delay?: number; width?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative h-px bg-brand/20" style={{ width }}>
      <motion.span
        className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand"
        initial={{ left: '0%', opacity: 0 }}
        animate={
          reduce
            ? { opacity: 0 }
            : { left: ['0%', '100%'], opacity: [0, 1, 1, 0] }
        }
        transition={{ duration: 1.4, repeat: reduce ? 0 : Infinity, ease: 'linear', delay, repeatDelay: 1.2 }}
      />
    </div>
  );
}

/** Dashed rounded boundary (cluster / secure-zone framing) with a soft glow. */
export function BoundaryFrame({
  children,
  label,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  label?: string;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay }}
      className={`relative rounded-2xl border border-dashed border-brand/30 p-3 ${className}`}
    >
      <motion.span
        aria-hidden="true"
        animate={reduce ? undefined : { opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-0 rounded-2xl shadow-[0_0_24px_4px_rgba(52,120,228,0.15)]"
      />
      {label && (
        <span className="absolute -top-2 left-3 bg-white px-1.5 text-[9px] font-semibold uppercase tracking-wide text-brand/70">
          {label}
        </span>
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}
