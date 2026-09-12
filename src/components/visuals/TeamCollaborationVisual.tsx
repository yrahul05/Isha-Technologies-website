'use client';

import {
  BadgeCheck,
  Cog,
  Handshake,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';

/**
 * About Us hero visual — a "people + collaboration" network: one central
 * team/people hub connected by six spokes to the concepts that define how
 * Isha Technologies works. Deliberately not an infrastructure/architecture
 * diagram — every node here is a human/culture concept, not a system.
 *
 * Layout is a regular hexagon (equal radius, 60° apart) so the connections
 * only ever run center → node, never node → node — a clean "hub" rather
 * than a closed/irregular polygon.
 */

type Node = {
  label: string;
  icon: LucideIcon;
  top: number;
  left: number;
  floatY: number;
  duration: number;
  delay: number;
};

const NODES: Node[] = [
  { label: 'People', icon: UsersRound, top: 12, left: 50, floatY: 4, duration: 3.4, delay: 0 },
  { label: 'Trust', icon: ShieldCheck, top: 31, left: 83, floatY: 5, duration: 3.8, delay: 0.3 },
  { label: 'Growth', icon: TrendingUp, top: 69, left: 83, floatY: 4, duration: 4.2, delay: 0.6 },
  { label: 'Collaboration', icon: Handshake, top: 88, left: 50, floatY: 6, duration: 3.6, delay: 0.9 },
  { label: 'Ownership', icon: BadgeCheck, top: 69, left: 17, floatY: 5, duration: 4, delay: 1.2 },
  { label: 'Engineering', icon: Cog, top: 31, left: 17, floatY: 4, duration: 3.9, delay: 1.5 },
];

const SIGNAL_STAGGER = 1.7;

export function TeamCollaborationVisual() {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);
  const [centerHovered, setCenterHovered] = useState(false);
  const boosted = centerHovered;

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-square w-full max-w-[300px] select-none sm:max-w-[340px] md:max-w-[420px] lg:max-w-[500px]"
    >
      {/* Subtle static grid backdrop */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-70">
        <defs>
          <pattern id="collab-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" className="fill-brand/10" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#collab-grid)" />
      </svg>

      {/* Single slow orbit ring, independent of the nodes */}
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: '50% 50%' }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={reduce ? undefined : { duration: 34, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            strokeWidth="0.5"
            strokeDasharray="1 3.5"
            className="stroke-brand/20"
          />
        </svg>
      </motion.div>

      {/* Spokes: center → each node, plus a traveling signal that visits them in turn */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
        {NODES.map((node, i) => (
          <line
            key={`line-${i}`}
            x1="50"
            y1="50"
            x2={node.left}
            y2={node.top}
            strokeWidth="0.5"
            className={`transition-[stroke-opacity] duration-200 ${
              hovered === i || boosted ? 'stroke-brand/55' : 'stroke-brand/20'
            }`}
          />
        ))}

        {NODES.map((node, i) => (
          <motion.circle
            key={`signal-${i}`}
            r="1"
            className="fill-brand"
            initial={{ cx: 50, cy: 50, opacity: 0 }}
            animate={
              reduce
                ? { opacity: 0 }
                : {
                    cx: [50, node.left],
                    cy: [50, node.top],
                    opacity: [0, 1, 1, 0],
                  }
            }
            transition={{
              duration: 1.5,
              repeat: reduce ? 0 : Infinity,
              ease: 'linear',
              delay: i * SIGNAL_STAGGER,
              repeatDelay: (NODES.length - 1) * SIGNAL_STAGGER,
            }}
          />
        ))}
      </svg>

      {/* Outer concept nodes */}
      {NODES.map((node, i) => (
        <motion.div
          key={node.label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ top: `${node.top}%`, left: `${node.left}%` }}
          animate={reduce ? undefined : { y: [0, -node.floatY, 0] }}
          transition={
            reduce ? undefined : { duration: node.duration, repeat: Infinity, ease: 'easeInOut', delay: node.delay }
          }
        >
          <div
            className="flex flex-col items-center gap-1"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered((v) => (v === i ? null : v))}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm transition-all duration-200 md:h-9 md:w-9 ${
                hovered === i ? 'scale-110 border-brand text-brand' : 'border-brand/20 text-brand/80'
              }`}
            >
              <node.icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <span
              className={`whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide transition-colors duration-200 md:text-[10px] ${
                hovered === i ? 'text-slate-800' : 'text-slate-500'
              }`}
            >
              {node.label}
            </span>
          </div>
        </motion.div>
      ))}

      {/* Central people/collaboration hub */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={reduce ? undefined : { y: [0, -3, 0], scale: [1, 1.025, 1] }}
        transition={reduce ? undefined : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Soft blue glow */}
        <div
          className={`absolute h-28 w-28 rounded-full bg-brand/5 blur-md transition-opacity duration-200 md:h-32 md:w-32 ${
            centerHovered ? 'opacity-100' : 'opacity-70'
          }`}
        />
        <div
          onMouseEnter={() => setCenterHovered(true)}
          onMouseLeave={() => setCenterHovered(false)}
          className={`relative flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-3xl border bg-white px-2 shadow-lg transition-all duration-200 md:h-28 md:w-28 ${
            centerHovered ? 'scale-105 border-brand/40 shadow-xl' : 'border-brand/20'
          }`}
        >
          <UsersRound className="h-9 w-9 text-brand md:h-10 md:w-10" strokeWidth={1.6} />
          <span className="text-center text-[8px] font-semibold uppercase leading-tight tracking-wide text-slate-500 md:text-[9px]">
            Isha Technologies
          </span>
          <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-brand shadow-md">
            <Handshake className="h-4 w-4 text-white" />
          </span>
        </div>
      </motion.div>
    </div>
  );
}
