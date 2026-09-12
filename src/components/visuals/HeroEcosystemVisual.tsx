'use client';

import {
  Activity,
  Boxes,
  ChartNoAxesCombined,
  Cloud,
  Server,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { MouseEvent } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

/**
 * Home hero — "Cloud Infrastructure Ecosystem" visual: a central
 * infrastructure core connected to six capability nodes narrating
 * Cloud -> Automation -> Kubernetes -> Security -> Reliability ->
 * Observability. Framer Motion only; every loop branches on
 * `useReducedMotion()`, following the same idiom as
 * `services/visuals/primitives.tsx`.
 */

const CENTER = { x: 50, y: 50 };
const CYCLE = 9; // seconds — full ripple loop length, shared by every node

type EcoNode = {
  icon: LucideIcon;
  label: string;
  x: number;
  y: number;
  path: string;
  cx: number[];
  cy: number[];
  floatDuration: number;
  floatDelay: number;
  pulseDelay: number;
  /** The two longer labels get a wider column so they wrap word-by-word
   *  ("Cloud" / "Infrastructure") instead of cramping against neighbors. */
  wide?: boolean;
};

function bezierSamples(
  p0: { x: number; y: number },
  c: { x: number; y: number },
  p2: { x: number; y: number },
  steps: number
) {
  const cx: number[] = [];
  const cy: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    cx.push(mt * mt * p0.x + 2 * mt * t * c.x + t * t * p2.x);
    cy.push(mt * mt * p0.y + 2 * mt * t * c.y + t * t * p2.y);
  }
  return { cx, cy };
}

function buildNode(
  icon: LucideIcon,
  label: string,
  x: number,
  y: number,
  bow: number,
  floatDuration: number,
  floatDelay: number,
  pulseDelay: number,
  wide?: boolean
): EcoNode {
  const mid = { x: (CENTER.x + x) / 2, y: (CENTER.y + y) / 2 };
  const dx = x - CENTER.x;
  const dy = y - CENTER.y;
  const len = Math.hypot(dx, dy) || 1;
  const control = { x: mid.x + (-dy / len) * bow, y: mid.y + (dx / len) * bow };
  const { cx, cy } = bezierSamples(CENTER, control, { x, y }, 14);
  return {
    icon,
    label,
    x,
    y,
    path: `M ${CENTER.x} ${CENTER.y} Q ${control.x} ${control.y} ${x} ${y}`,
    cx,
    cy,
    floatDuration,
    floatDelay,
    pulseDelay,
    wide,
  };
}

// Hexagon around the core, clockwise from the top — matches the narrative
// flow Cloud Infrastructure -> Infrastructure Automation -> Kubernetes ->
// Security -> Reliability -> Observability, each a real Isha Technologies
// engineering capability connected to the central Infrastructure core.
const NODES: EcoNode[] = [
  buildNode(Cloud, 'Cloud Infrastructure', 50, 8, 6, 5.2, 0, 0, true),
  buildNode(Workflow, 'Infrastructure Automation', 86, 29, -6, 5.6, 0.3, 0.35, true),
  buildNode(Boxes, 'Kubernetes', 86, 71, 6, 5.4, 0.6, 0.7),
  buildNode(ShieldCheck, 'Security', 50, 92, -6, 5.8, 0.9, 1.05),
  buildNode(Activity, 'Reliability', 14, 71, 6, 5.3, 1.2, 1.4),
  buildNode(ChartNoAxesCombined, 'Observability', 14, 29, -6, 5.7, 1.5, 1.75),
];

export function HeroEcosystemVisual() {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const springX = useSpring(px, { stiffness: 60, damping: 18, mass: 0.4 });
  const springY = useSpring(py, { stiffness: 60, damping: 18, mass: 0.4 });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    if (window.innerWidth < 1024) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    px.set(relX * 14);
    py.set(relY * 14);
  }

  function handleMouseLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <div
      aria-hidden="true"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative mx-auto aspect-square w-full max-w-[300px] select-none sm:max-w-[360px] md:max-w-[420px] lg:max-w-[460px]"
    >
      {/* soft ambient glow */}
      <div className="absolute inset-[8%] rounded-full bg-brand/5 blur-2xl" />

      {/* dot-grid backdrop */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-70">
        <defs>
          <pattern id="hero-eco-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" className="fill-brand/10" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#hero-eco-grid)" />
      </svg>

      {/* slow decorative orbital ring */}
      <motion.div
        className="absolute inset-0"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 130, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            strokeWidth="0.5"
            strokeDasharray="1 4"
            className="stroke-brand/25"
          />
        </svg>
      </motion.div>

      {/* parallax layer: connections + outer nodes */}
      <motion.div
        style={{ x: springX, y: springY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0"
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          {NODES.map((node, i) => (
            <path
              key={`line-${i}`}
              d={node.path}
              fill="none"
              strokeWidth="0.5"
              strokeDasharray="2 3"
              className="stroke-brand/25"
            />
          ))}
          {NODES.map((node, i) => (
            <motion.circle
              key={`pulse-${i}`}
              r="1.1"
              className="fill-brand"
              initial={{ opacity: 0, cx: node.cx[0], cy: node.cy[0] }}
              animate={
                reduce ? { opacity: 0 } : { cx: node.cx, cy: node.cy, opacity: [0, 1, 1, 0] }
              }
              transition={{
                duration: 3.4,
                repeat: reduce ? 0 : Infinity,
                ease: 'linear',
                delay: node.pulseDelay,
                repeatDelay: 2.2,
              }}
            />
          ))}
        </svg>

        {NODES.map((node, i) => {
          const Icon = node.icon;
          return (
            <motion.div
              key={node.label}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 ${
                node.wide ? 'w-[74px] sm:w-[92px] md:w-[104px]' : 'w-[58px] sm:w-[72px]'
              }`}
              style={{ top: `${node.y}%`, left: `${node.x}%` }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={
                reduce
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 1, scale: 1, y: [0, -4, 0] }
              }
              transition={
                reduce
                  ? { duration: 0.5, delay: 0.2 + i * 0.05 }
                  : {
                      opacity: { duration: 0.5, delay: 0.2 + i * 0.08 },
                      scale: { duration: 0.5, delay: 0.2 + i * 0.08 },
                      y: {
                        duration: node.floatDuration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: node.floatDelay,
                      },
                    }
              }
            >
              <motion.div
                animate={
                  reduce
                    ? undefined
                    : {
                        scale: [1, 1.16, 1],
                        boxShadow: [
                          '0 1px 2px rgba(52,120,228,0.08)',
                          '0 10px 22px -4px rgba(52,120,228,0.5)',
                          '0 1px 2px rgba(52,120,228,0.08)',
                        ],
                      }
                }
                transition={{
                  duration: 0.7,
                  ease: 'easeInOut',
                  delay: node.pulseDelay + 0.4,
                  repeat: Infinity,
                  repeatDelay: CYCLE - 0.7,
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/15 bg-white text-brand shadow-sm sm:h-10 sm:w-10"
              >
                <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.75} />
              </motion.div>
              <span className="block break-words text-center text-[9px] font-medium leading-[1.2] text-slate-600 sm:text-[10px] md:text-[11px]">
                {node.label}
              </span>
            </motion.div>
          );
        })}
      </motion.div>

      {/* central infrastructure core */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={
          reduce ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -6, 0] }
        }
        transition={
          reduce
            ? { duration: 0.6 }
            : {
                opacity: { duration: 0.6 },
                scale: { duration: 0.6 },
                y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
              }
        }
        className="absolute inset-0 flex items-center justify-center"
      >
        <motion.span
          animate={
            reduce ? undefined : { opacity: [0.5, 0.85, 0.5], scale: [1, 1.3, 1] }
          }
          transition={{ duration: CYCLE, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute h-24 w-24 rounded-full bg-brand/10 blur-xl sm:h-28 sm:w-28"
        />
        <motion.div
          animate={
            reduce
              ? undefined
              : {
                  scale: [1, 1.06, 1],
                  boxShadow: [
                    '0 20px 45px -20px rgba(52,120,228,0.35)',
                    '0 26px 55px -16px rgba(52,120,228,0.55)',
                    '0 20px 45px -20px rgba(52,120,228,0.35)',
                  ],
                }
          }
          transition={{ duration: 0.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: CYCLE - 0.8 }}
          className="relative flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-[28px] border border-brand/15 bg-white sm:h-28 sm:w-28"
        >
          <span className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-brand/10 via-transparent to-transparent" />
          <Server className="relative h-9 w-9 text-brand sm:h-10 sm:w-10" strokeWidth={1.5} />
          <span className="relative text-[8px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[9px]">
            Infrastructure
          </span>
          <motion.span
            animate={
              reduce ? undefined : { scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }
            }
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full border-2 border-white bg-brand"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
