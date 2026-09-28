'use client';

import { BellRing, FileText, LineChart, Search, Sparkles, Users } from 'lucide-react';
import { HConnector, MiniNode, VConnector, VisualCanvas, VisualNode } from './primitives';

const SIGNALS = [
  { icon: LineChart, label: 'Metrics' },
  { icon: FileText, label: 'Logs' },
  { icon: BellRing, label: 'Alerts' },
];

/** AI-Powered DevOps & AIOps — signals feed an AI correlation step that
 * hands a hypothesis to an engineer, who stays the one making the call. */
export function AIOpsInvestigationVisual() {
  return (
    <VisualCanvas>
      <div className="flex flex-col items-center py-6">
        <div className="flex items-end justify-center gap-3">
          {SIGNALS.map((signal, idx) => (
            <MiniNode key={signal.label} icon={signal.icon} label={signal.label} delay={idx * 0.1} pulse />
          ))}
        </div>
        <VConnector delay={0.3} height={16} />
        <VisualNode icon={Sparkles} label="AI Correlation" delay={0.35} emphasis />
        <VConnector delay={0.5} height={16} />
        <div className="flex items-center gap-2">
          <VisualNode icon={Search} label="Hypothesis" delay={0.55} />
          <HConnector delay={0.65} width={14} />
          <VisualNode icon={Users} label="Engineer Decides" delay={0.7} emphasis />
        </div>
        <p className="mt-4 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          AI Assists · Humans Decide
        </p>
      </div>
    </VisualCanvas>
  );
}
