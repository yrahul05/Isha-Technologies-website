'use client';

import { useEffect, useState, useTransition } from 'react';
import { Archive, ArchiveRestore, Download, Eye, History, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionForm, SelectField, SubmitButton, TextField } from '../forms';
import { archiveDocumentAction, deleteDocumentAction, documentVersionsAction, updateDocumentAction } from '@/server/actions/documents';
import { fileSize, fmtDateTime } from '@/lib/portal/format';
import { UploadButton } from './Uploader';

const iconBtn = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-slate-500 transition-colors hover:border-brand hover:text-brand';

export function PreviewButton({ id, name, kind }: { id: string; name: string; kind: 'pdf' | 'image' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={iconBtn} aria-label={`Preview ${name}`}>
        <Eye className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[88vh] max-w-[calc(100%-1.5rem)] flex-col gap-3 rounded-2xl bg-white p-4 sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8 text-base font-semibold text-slate-900">{name}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-slate-50">
            {open &&
              (kind === 'pdf' ? (
                <iframe title={name} src={`/api/portal/documents/${id}/download?inline=1`} className="h-full w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated file; not optimisable by next/image
                <img src={`/api/portal/documents/${id}/download?inline=1`} alt={name} className="mx-auto h-full max-h-full object-contain" />
              ))}
          </div>
          <a href={`/api/portal/documents/${id}/download`} className="inline-flex items-center gap-1.5 self-end text-sm font-semibold text-brand hover:underline">
            <Download className="h-4 w-4" /> Download
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}

type Version = { version: number; fileName: string; sizeBytes: number; createdAt: Date; by: string | null };

export function VersionsButton({ id, name, canUpload }: { id: string; name: string; canUpload: boolean }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[] | null>(null);
  useEffect(() => {
    if (open) void documentVersionsAction(id).then(setVersions);
  }, [open, id]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={iconBtn} aria-label={`Version history for ${name}`}>
        <History className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">Version history</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 truncate text-sm text-slate-500">{name}</p>
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {versions === null && <li className="text-sm text-slate-500">Loading…</li>}
            {versions?.map((v, i) => (
              <li key={v.version} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2">
                <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-bold text-brand">v{v.version}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-800">{v.fileName}</span>
                  <span className="block text-xs text-slate-500">
                    {fmtDateTime(v.createdAt)} · {v.by ?? '—'} · {fileSize(v.sizeBytes)}
                    {i === versions.length - 1 ? ' · current' : ''}
                  </span>
                </span>
                <a href={`/api/portal/documents/${id}/download?v=${v.version}`} className={iconBtn} aria-label={`Download version ${v.version}`}>
                  <Download className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
          {canUpload && <UploadButton target={{ documentId: id }} label="Upload new version" multiple={false} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EditDocumentButton({ doc }: { doc: { id: string; name: string; category: string; visibility: string; hasClient: boolean } }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={iconBtn} aria-label={`Rename or share ${doc.name}`}>
        <Pencil className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">Edit document</DialogTitle>
          </DialogHeader>
          {open && (
            <ActionForm action={updateDocumentAction} onSuccess={() => setOpen(false)}>
              <input type="hidden" name="id" value={doc.id} />
              <TextField label="Name" name="name" required defaultValue={doc.name} />
              <SelectField label="Category" name="category" defaultValue={doc.category} options={CATEGORY_OPTIONS} />
              {doc.hasClient ? (
                <SelectField
                  label="Access"
                  name="visibility"
                  defaultValue={doc.visibility}
                  options={[
                    { value: 'internal', label: 'Internal — team only' },
                    { value: 'client', label: 'Shared with the client' },
                  ]}
                />
              ) : (
                <input type="hidden" name="visibility" value="internal" />
              )}
              <div className="flex justify-end">
                <SubmitButton>Save</SubmitButton>
              </div>
            </ActionForm>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteDocumentButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => {
            const r = await deleteDocumentAction(id);
            if (r.error) setError(r.error);
          })}
          className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
        >
          Delete
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">
          Cancel
        </button>
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setConfirming(true)} className={`${iconBtn} hover:border-rose-300 hover:text-rose-600`} aria-label={`Delete ${name}`}>
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

export function ArchiveDocumentButton({ id, name, archived }: { id: string; name: string; archived: boolean }) {
  const [pending, start] = useTransition();
  const Icon = archived ? ArchiveRestore : Archive;
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => void (await archiveDocumentAction(id, !archived)))} className={iconBtn} aria-label={`${archived ? 'Restore' : 'Archive'} ${name}`} title={archived ? 'Restore from archive' : 'Archive'}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

export const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'contract', label: 'Contract / agreement' },
  { value: 'proposal', label: 'Proposal / SOW' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'report', label: 'Report' },
  { value: 'requirements', label: 'Requirements' },
  { value: 'invoice', label: 'Finance' },
  { value: 'other', label: 'Other' },
];
