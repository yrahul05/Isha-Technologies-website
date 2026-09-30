'use client';

import { useState } from 'react';
import { UploadButton } from './Uploader';
import { CATEGORY_OPTIONS } from './DocumentActions';
import { cn } from '@/lib/utils';

const select = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

/** Where-to-upload chooser. The server re-validates every choice (see resolveUploadTarget). */
export function UploadPanel({
  isInternal,
  canManage,
  clients,
  projects,
  defaultClientId,
}: {
  isInternal: boolean;
  canManage: boolean;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  defaultClientId?: string;
}) {
  const [clientId, setClientId] = useState(defaultClientId ?? '');
  const [projectId, setProjectId] = useState('');
  const [visibility, setVisibility] = useState<'internal' | 'client'>('internal');
  const [category, setCategory] = useState('general');
  const projectChoices = isInternal && clientId ? projects.filter((p) => p.clientId === clientId) : projects;

  const target = projectId
    ? { projectId, visibility, category }
    : clientId
      ? { clientId, visibility, category }
      : { visibility, category };

  return (
    <div className="space-y-3">
      <div className={cn('grid gap-3', isInternal ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2')}>
        {isInternal && canManage && (
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700">Client</span>
            <select
              className={select}
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setProjectId('');
              }}
            >
              <option value="">Internal (no client)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-700">Project</span>
          <select className={select} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">{isInternal ? 'No specific project' : 'General (my account)'}</option>
            {projectChoices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-700">Category</span>
          <select className={select} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        {isInternal && (
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-700">Access</span>
            <select className={select} value={visibility} disabled={!clientId && !projectId} onChange={(e) => setVisibility(e.target.value as 'internal' | 'client')}>
              <option value="internal">Internal — team only</option>
              <option value="client">Shared with the client</option>
            </select>
          </label>
        )}
      </div>
      <UploadButton key={JSON.stringify(target)} target={target} label={isInternal ? 'Upload documents' : 'Share documents with Isha Technologies'} />
    </div>
  );
}
