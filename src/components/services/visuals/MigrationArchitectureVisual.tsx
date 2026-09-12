'use client';

import {
  ArrowRightLeft,
  Cloud,
  ClipboardList,
  Database,
  HardDrive,
  Layers,
  Network,
  Server,
} from 'lucide-react';
import { HConnector, MiniNode, VisualCanvas } from './primitives';

function Column({
  title,
  items,
  delay,
  active = false,
}: {
  title: string;
  items: { icon: typeof Server; label: string }[];
  delay: number;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-center text-[8.5px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </span>
      <div className="grid grid-cols-1 gap-2">
        {items.map((item, idx) => (
          <MiniNode
            key={item.label}
            icon={item.icon}
            label={item.label}
            delay={delay + idx * 0.08}
            pulse={active}
          />
        ))}
      </div>
    </div>
  );
}

/** Cloud Migration — infrastructure moving from an existing estate, through a migration layer, into the cloud. */
export function MigrationArchitectureVisual() {
  return (
    <VisualCanvas>
      <div className="flex items-start justify-center gap-1.5 py-6">
        <Column
          delay={0}
          title="Existing"
          items={[
            { icon: Server, label: 'Servers' },
            { icon: Database, label: 'Database' },
            { icon: Layers, label: 'Applications' },
            { icon: Network, label: 'Network' },
          ]}
        />

        <div className="mt-6 flex flex-col items-center gap-4 pt-2">
          <HConnector delay={0.2} width={14} />
          <ClipboardList className="h-3 w-3 shrink-0 text-brand/60" />
          <HConnector delay={0.9} width={14} />
        </div>

        <Column
          delay={0.3}
          title="Migration"
          items={[
            { icon: ClipboardList, label: 'Assessment' },
            { icon: ArrowRightLeft, label: 'Replication' },
            { icon: ArrowRightLeft, label: 'Migration' },
            { icon: HardDrive, label: 'Validation' },
          ]}
        />

        <div className="mt-6 flex flex-col items-center gap-4 pt-2">
          <HConnector delay={0.6} width={14} />
          <ArrowRightLeft className="h-3 w-3 shrink-0 text-brand/60" />
          <HConnector delay={1.3} width={14} />
        </div>

        <Column
          delay={0.6}
          title="Cloud"
          active
          items={[
            { icon: Server, label: 'Compute' },
            { icon: Database, label: 'Database' },
            { icon: HardDrive, label: 'Storage' },
            { icon: Cloud, label: 'Network' },
          ]}
        />
      </div>
    </VisualCanvas>
  );
}
