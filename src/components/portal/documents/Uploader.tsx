'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CloudUpload, Loader2, Paperclip, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ACCEPT_ATTR } from '@/lib/portal/file-types';
import { fileSize } from '@/lib/portal/format';
import { finalizeUploadAction, initUploadAction, type ClientUploadPlan } from '@/server/actions/documents';

export type UploadTarget = {
  documentId?: string;
  clientId?: string;
  projectId?: string;
  taskId?: string;
  ticketId?: string;
  visibility?: 'internal' | 'client';
  category?: string;
};

type Row = { name: string; size: number; progress: number; state: 'uploading' | 'done' | 'error'; message?: string };

function putWithProgress(url: string, headers: Record<string, string>, file: Blob, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

/** Sends the bytes according to the server's plan for the configured StorageProvider. */
async function sendFile(plan: ClientUploadPlan, file: File, onProgress: (p: number) => void): Promise<void> {
  if (plan.mode === 'presigned') return putWithProgress(plan.url, plan.headers, file, onProgress);
  if (plan.mode === 'blob-client') {
    const { put } = await import('@vercel/blob/client');
    await put(plan.pathname, file, { access: 'private', token: plan.clientToken, contentType: plan.contentType, onUploadProgress: (e) => onProgress(Math.round(e.percentage)) });
    return;
  }
  // proxy: ≤ 4 MB parts to our own authenticated route
  for (let part = 0; part < plan.parts; part++) {
    const chunk = file.slice(part * plan.partSize, (part + 1) * plan.partSize);
    await putWithProgress(`${plan.url}&part=${part}`, { 'Content-Type': 'application/octet-stream' }, chunk, (p) => onProgress(Math.round(((part + p / 100) / plan.parts) * 100)));
  }
}

/**
 * Upload button: authorise → upload bytes directly to storage → server
 * verifies size and file signature → document/version is created.
 */
export function UploadButton({ target, label = 'Upload', compact = false, multiple = true }: { target: UploadTarget; label?: string; compact?: boolean; multiple?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const patch = (i: number, p: Partial<Row>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const upload = async (files: FileList) => {
    const list = Array.from(files).slice(0, 10);
    const start = rows.length;
    setRows((r) => [...r, ...list.map((f) => ({ name: f.name, size: f.size, progress: 0, state: 'uploading' as const }))]);
    await Promise.all(
      list.map(async (file, k) => {
        const i = start + k;
        try {
          const init = await initUploadAction({ fileName: file.name, size: file.size, target });
          if (!init.ok) throw new Error(init.error);
          await sendFile(init.plan, file, (p) => patch(i, { progress: p }));
          const done = await finalizeUploadAction(init.uploadId);
          if (done.error) throw new Error(done.error);
          patch(i, { state: 'done', progress: 100 });
        } catch (e) {
          patch(i, { state: 'error', message: e instanceof Error ? e.message : 'Upload failed' });
        }
      })
    );
    router.refresh();
    if (input.current) input.current.value = '';
  };

  return (
    <div className={cn(!compact && 'w-full')}>
      <input ref={input} type="file" accept={ACCEPT_ATTR} multiple={multiple} className="sr-only" id={`upload-${JSON.stringify(target)}`} onChange={(e) => e.target.files?.length && void upload(e.target.files)} />
      {compact ? (
        <Button type="button" variant="secondary" onClick={() => input.current?.click()} className="h-9 rounded-lg px-3 text-sm">
          <Paperclip className="h-4 w-4" /> {label}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
          }}
          className="group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand/25 bg-brand/[0.03] px-6 py-8 text-center transition-colors hover:border-brand/60 hover:bg-brand/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand shadow-sm ring-1 ring-brand/15 transition-transform group-hover:-translate-y-0.5">
            <CloudUpload className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="mt-3 text-sm font-semibold text-slate-900">{label}</span>
          <span className="mt-1 text-xs text-slate-500">Drag & drop or click · PDF, Word, Excel, CSV, PNG, JPG, ZIP</span>
        </button>
      )}
      {rows.length > 0 && (
        <ul className={cn('mt-3 space-y-2', compact && 'min-w-64')}>
          {rows.map((r, i) => (
            <li key={i} className="rounded-xl border border-gray-100 bg-white px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                {r.state === 'uploading' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand" />}
                {r.state === 'done' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                {r.state === 'error' && <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />}
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{r.name}</span>
                <span className="shrink-0 text-slate-400">{fileSize(r.size)}</span>
              </div>
              {r.state === 'uploading' && (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${r.progress}%` }} />
                </div>
              )}
              {r.message && <p className="mt-1 text-[11px] text-rose-600">{r.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
