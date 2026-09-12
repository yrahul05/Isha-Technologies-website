'use client';

import {
  Activity,
  Container,
  FileCode2,
  GitBranch,
  Hammer,
  CheckCircle2,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { VConnector, VisualCanvas, VisualNode } from './primitives';

const STAGES = [
  { icon: FileCode2, label: 'Code' },
  { icon: GitBranch, label: 'Git' },
  { icon: Hammer, label: 'Build' },
  { icon: CheckCircle2, label: 'Test' },
  { icon: ShieldCheck, label: 'Security Scan' },
  { icon: Container, label: 'Container' },
  { icon: UploadCloud, label: 'Deploy' },
  { icon: Activity, label: 'Monitor' },
];

/** DevOps Solutions — a signal traveling the full path from code to production. */
export function DevOpsPipelineVisual() {
  const reduce = useReducedMotion();
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-4">
        {STAGES.map((stage, idx) => (
          <div key={stage.label} className="flex flex-col items-center">
            <VisualNode icon={stage.icon} label={stage.label} delay={idx * 0.06} pulse={false} />
            {idx < STAGES.length - 1 && <VConnector delay={idx * 0.18} height={14} />}
          </div>
        ))}

        {/* Monitoring signal returning toward the system */}
        <motion.span
          aria-hidden="true"
          className="mt-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-brand/60"
          initial={{ opacity: 0 }}
          animate={reduce ? { opacity: 0 } : { opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: reduce ? 0 : Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
        >
          feedback signal ↑
        </motion.span>
      </div>
    </VisualCanvas>
  );
}
