'use client';

import { CalendarDays, Mail, MessageCircle, MessagesSquare, Phone, Send, Headphones, ServerCog } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ElementType } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { SiSignal } from 'react-icons/si';

type OrbitNode = {
  icon: ElementType;
  label: string;
  top: string;
  left: string;
  delay: number;
  /** Trimmed from 8 nodes to 5 on small screens to avoid crowding. */
  hideOnMobile?: boolean;
  /** The genuinely long labels need extra label width and permission to
   *  wrap onto a second line — everything else stays on one line. */
  wideLabel?: boolean;
  /** Per-node override of the wrapped label's width, for a label whose
   *  longest word doesn't fit the shared `wideLabel` width (e.g.
   *  "Infrastructure" is longer than "Technical" or "Schedule"). */
  labelWidthClass?: string;
};

// Eight real ways to reach Isha Technologies, spaced around the ring — the
// same brand icons used for these channels elsewhere on the site (Footer,
// Contact page CTAs), not a generic cloud/architecture diagram. The four
// always-visible channels (Email, Phone, WhatsApp, Schedule a Meeting) sit
// on cardinal/SW points; Signal sits on a diagonal point already hidden on
// mobile. Infrastructure Support fills the diagonal point between Phone and
// WhatsApp (a `ServerCog` icon, kept distinct from the `Headphones` icon
// already used by Expert Support).
const ORBIT_NODES: OrbitNode[] = [
  { icon: Mail, label: 'Email', top: '8%', left: '50%', delay: 0 },
  { icon: SiSignal, label: 'Signal', top: '20%', left: '80%', delay: 0.15, hideOnMobile: true },
  { icon: Phone, label: 'Phone', top: '50%', left: '92%', delay: 0.3 },
  {
    icon: ServerCog,
    label: 'Infrastructure Support',
    top: '80%',
    left: '80%',
    delay: 0.45,
    hideOnMobile: true,
    wideLabel: true,
    labelWidthClass: 'w-24 sm:w-[108px]',
  },
  { icon: FaWhatsapp, label: 'WhatsApp', top: '92%', left: '50%', delay: 0.6 },
  { icon: CalendarDays, label: 'Schedule a Meeting', top: '80%', left: '20%', delay: 0.75, wideLabel: true },
  { icon: MessagesSquare, label: 'Technical Consultation', top: '50%', left: '8%', delay: 0.9, wideLabel: true },
  { icon: Headphones, label: 'Expert Support', top: '20%', left: '20%', delay: 1.05, hideOnMobile: true },
];

// Radial connector lines from the hub to each node above. Only a few carry
// the slow dashed "signal" pulse so the effect reads as subtle rather than busy.
const RADIAL_LINES: { x2: number; y2: number; flow: boolean; delay: string }[] = [
  { x2: 50, y2: 8, flow: true, delay: '0s' },
  { x2: 80, y2: 20, flow: false, delay: '0s' },
  { x2: 92, y2: 50, flow: true, delay: '0.9s' },
  { x2: 80, y2: 80, flow: false, delay: '0s' },
  { x2: 50, y2: 92, flow: true, delay: '1.8s' },
  { x2: 20, y2: 80, flow: false, delay: '0s' },
  { x2: 8, y2: 50, flow: true, delay: '2.7s' },
  { x2: 20, y2: 20, flow: false, delay: '0s' },
];

/**
 * Contact page hero visual — an orbital "reach us" composition: a central
 * conversation hub with contact and consultation touchpoints orbiting
 * around it, connected by thin animated signal lines. Built on the same
 * CSS-keyframe orbit system as the About page's `TeamCollaborationVisual`
 * (see globals.css `@theme inline` block: orbit-spin, node-pulse,
 * line-flow, float-center) so the continuous motion is cheap, GPU-driven
 * CSS rather than per-frame JS, and every one of those classes is applied
 * only via Tailwind's `motion-safe:` variant — so prefers-reduced-motion
 * users automatically get a calm, static diagram with no extra logic here.
 * Framer Motion is used only for the one-shot mount entrance and hover
 * feedback, matching the rest of the site's visual system.
 */
export function ContactVisual() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-[320px] select-none sm:max-w-[380px] md:max-w-[440px]"
    >
      <div className="relative aspect-square w-full">
        {/* Subtle dot-grid backdrop */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <defs>
            <pattern id="contact-visual-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.6" className="fill-brand/10" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#contact-visual-grid)" />
        </svg>

        {/* Rotating layer: orbit ring, radial signal lines and touchpoint nodes */}
        <div className="motion-safe:animate-orbit-spin absolute inset-0">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              strokeWidth="0.6"
              strokeDasharray="2 3"
              className="stroke-brand/25"
            />
            {RADIAL_LINES.map((line, i) => (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={line.x2}
                y2={line.y2}
                strokeWidth="0.5"
                strokeDasharray={line.flow ? '3 3' : undefined}
                style={line.flow ? { animationDelay: line.delay } : undefined}
                className={
                  line.flow ? 'stroke-brand/50 motion-safe:animate-line-flow' : 'stroke-brand/15'
                }
              />
            ))}
          </svg>

          {ORBIT_NODES.map((node) => (
            <div
              key={node.label}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${node.hideOnMobile ? 'hidden sm:block' : ''}`}
              style={{ top: node.top, left: node.left }}
            >
              {/* Counter-rotates against the orbit so the card stays upright */}
              <div className="motion-safe:animate-orbit-spin-reverse">
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut', delay: node.delay }}
                  className="motion-safe:animate-node-pulse group relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-500 shadow-sm transition-all duration-200 ease-out hover:scale-110 hover:border-brand hover:text-brand hover:shadow-md motion-reduce:hover:scale-100 md:h-10 md:w-10"
                  style={{ animationDelay: `${node.delay}s`, animationDuration: '3.2s' }}
                >
                  <node.icon className="h-4 w-4" strokeWidth={1.75} />

                  {/* Persistent label — absolutely positioned below the icon
                      so it never affects the icon card's own size, meaning
                      the icon stays centered on exactly the same orbit
                      point as before. Moves, pulses and scales together
                      with the icon since it's a child of the same card. */}
                  <span
                    className={`pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 text-center text-[10px] font-medium leading-[1.2] text-slate-600 transition-colors duration-200 ease-out group-hover:text-brand sm:text-[11px] md:text-[12px] [writing-mode:horizontal-tb] ${
                      node.wideLabel
                        ? `break-words ${node.labelWidthClass ?? 'w-20 sm:w-[92px]'}`
                        : 'w-max whitespace-nowrap'
                    }`}
                  >
                    {node.label}
                  </span>
                </motion.div>
              </div>
            </div>
          ))}
        </div>

        {/* Central conversation hub */}
        <div className="motion-safe:animate-float-center absolute inset-0 flex items-center justify-center">
          <div
            className="motion-safe:animate-node-pulse absolute h-24 w-24 rounded-full bg-brand/5 md:h-28 md:w-28"
            style={{ animationDuration: '5s' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-brand/20 bg-white shadow-lg md:h-24 md:w-24"
          >
            <span
              className="motion-safe:animate-node-pulse flex"
              style={{ animationDuration: '3.4s' }}
            >
              <MessageCircle className="h-9 w-9 text-brand md:h-10 md:w-10" strokeWidth={1.6} />
            </span>
            <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-xl bg-brand shadow-md">
              <Send className="h-3.5 w-3.5 text-white" strokeWidth={1.9} />
            </span>
          </motion.div>
        </div>
      </div>

      <p className="mt-3 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        Conversation · Requirements · The Right Team
      </p>
    </div>
  );
}
