import { Download, Eye, FileArchive, FileImage, FileSpreadsheet, FileText, Lock } from 'lucide-react';
import { fmtDate } from '@/lib/portal/format';
import { fileKindFor } from '@/lib/portal/file-types';
import { Badge } from '../ui';
import { PreviewButton } from './DocumentActions';

export function DocIcon({ name }: { name: string }) {
  const kind = fileKindFor(name);
  const Icon = kind?.previewable === 'image' ? FileImage : kind?.label === 'Excel' || kind?.label === 'CSV' ? FileSpreadsheet : kind?.label === 'ZIP' ? FileArchive : FileText;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}

/** Compact document list for task / project / ticket pages. */
export function DocumentRowList({
  docs,
  showVisibility,
}: {
  docs: { id: string; name: string; currentVersion: number; updatedAt: Date; visibility: 'internal' | 'client' }[];
  showVisibility: boolean;
}) {
  return (
    <ul className="divide-y divide-gray-100">
      {docs.map((d) => {
        const kind = fileKindFor(d.name);
        return (
          <li key={d.id} className="flex items-center gap-3 py-2.5">
            <DocIcon name={d.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{d.name}</p>
              <p className="flex items-center gap-2 text-xs text-slate-500">
                v{d.currentVersion} · {fmtDate(d.updatedAt)}
                {showVisibility &&
                  (d.visibility === 'client' ? (
                    <Badge tone="brand">
                      <Eye className="h-3 w-3" /> Client
                    </Badge>
                  ) : (
                    <Badge tone="slate">
                      <Lock className="h-3 w-3" /> Internal
                    </Badge>
                  ))}
              </p>
            </div>
            {kind?.previewable && <PreviewButton id={d.id} name={d.name} kind={kind.previewable} />}
            <a
              href={`/api/portal/documents/${d.id}/download`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-slate-500 hover:border-brand hover:text-brand"
              aria-label={`Download ${d.name}`}
            >
              <Download className="h-4 w-4" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
