'use client';

import { BellRing, FileText, GitMerge, Lightbulb, LineChart, Waypoints, Zap } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { MiniNode, VConnector, VisualCanvas, VisualNode } from './primitives';

const INPUTS = [
  { icon: LineChart, label: 'Metrics', top: '10%' },
  { icon: FileText, label: 'Logs', top: '45%' },
  { icon: Waypoints, label: 'Traces', top: '80%' },
];

const CORRELATION_POINT = { top: 45, left: 78 };

/** Observability — metrics, logs and traces converging into one correlated signal. */
export function ObservabilitySignalsVisual() {
  const reduce = useReducedMotion();

  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <div className="relative h-[130px] w-full max-w-[300px]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
            {INPUTS.map((input) => {
              const y1 = parseFloat(input.top) + 6;
              return (
                <path
                  key={input.label}
                  d={`M18,${y1} C50,${y1} 50,${CORRELATION_POINT.top} ${CORRELATION_POINT.left - 8},${CORRELATION_POINT.top}`}
                  fill="none"
                  strokeWidth="0.6"
                  className="stroke-brand/25"
                />
              );
            })}
          </svg>

          {/* Traveling signal dots — plain top/left percentages (same proven
              approach as VConnector/HConnector) rather than animating SVG
              cx/cy attributes, which are traced along the curve above. */}
          {INPUTS.map((input, idx) => {
            const y1 = `${parseFloat(input.top) + 6}%`;
            return (
              <motion.span
                key={input.label}
                aria-hidden="true"
                className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand"
                initial={{ top: y1, left: '18%', opacity: 0 }}
                animate={
                  reduce
                    ? { opacity: 0 }
                    : {
                        top: [y1, y1, `${CORRELATION_POINT.top}%`],
                        left: ['18%', '50%', `${CORRELATION_POINT.left - 8}%`],
                        opacity: [0, 1, 0],
                      }
                }
                transition={{
                  duration: 2.2,
                  repeat: reduce ? 0 : Infinity,
                  ease: 'linear',
                  delay: idx * 0.5,
                  repeatDelay: 1.2,
                }}
              />
            );
          })}

          {INPUTS.map((input, idx) => (
            <div
              key={input.label}
              className="absolute -translate-y-1/2"
              style={{ top: input.top, left: '2%' }}
            >
              <MiniNode icon={input.icon} label={input.label} delay={idx * 0.1} pulse />
            </div>
          ))}

          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${CORRELATION_POINT.top}%`, left: `${CORRELATION_POINT.left}%` }}
          >
            <VisualNode icon={GitMerge} label="Correlation" delay={0.5} emphasis />
          </div>
        </div>

        <VConnector delay={0.6} />
        <VisualNode icon={Lightbulb} label="Insight" delay={0.6} />
        <VConnector delay={0.7} />
        <VisualNode icon={BellRing} label="Alert" delay={0.7} />
        <VConnector delay={0.8} />
        <VisualNode icon={Zap} label="Response" delay={0.8} />

        <p className="mt-3 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Prometheus · Grafana · CloudWatch
        </p>
      </div>
    </VisualCanvas>
  );
}
