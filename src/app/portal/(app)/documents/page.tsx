import type { Metadata } from 'next';
import Link from 'next/link';
import { alias } from 'drizzle-orm/pg-core';
import { and, asc, desc, eq, ilike, ne } from 'drizzle-orm';
import { Download, Eye, FolderLock, Lock, Search } from 'lucide-react';
import { db } from '@/server/db';
import { clients, documentVersions, documents, projects, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { canManageDocument } from '@/server/documents';
import { clientScope, documentScope, isUuid, projectScope } from '@/server/scope';
import { Badge, EmptyState, PageHeader, Panel, Table, Td, Th, Tr } from '@/components/portal/ui';
import { DocIcon } from '@/components/portal/documents/DocumentRowList';
import { DeleteDocumentButton, EditDocumentButton, PreviewButton, VersionsButton } from '@/components/portal/documents/DocumentActions';
import { UploadPanel } from '@/components/portal/documents/UploadPanel';
import { inputClass } from '@/components/portal/forms';
import { fileKindFor } from '@/lib/portal/file-types';
import { fileSize, fmtDate, humanize } from '@/lib/portal/format';
import { cn } from '@/lib/utils';
import { storageDriver } from '@/server/storage';

export const metadata: Metadata = { title: 'Documents' };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string; client?: string; project?: string; doc?: string; upload?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const term = (sp.q ?? '').trim().slice(0, 80);
  const clientFilter = isUuid(sp.client) ? sp.client : undefined;
  const projectFilter = isUuid(sp.project) ? sp.project : undefined;
  const focus = isUuid(sp.doc) ? sp.doc : undefined;

  const latest = alias(documentVersions, 'latest');
  const rows = await db
    .select({ d: documents, clientName: clients.companyName, projectName: projects.name, uploader: users.name, size: latest.sizeBytes })
    .from(documents)
    .leftJoin(clients, eq(clients.id, documents.clientId))
    .leftJoin(projects, eq(projects.id, documents.projectId))
    .leftJoin(users, eq(users.id, documents.uploadedBy))
    .leftJoin(latest, and(eq(latest.documentId, documents.id), eq(latest.version, documents.currentVersion)))
    .where(
      and(
        documentScope(viewer),
        focus ? eq(documents.id, focus) : undefined,
        clientFilter ? eq(documents.clientId, clientFilter) : undefined,
        projectFilter ? eq(documents.projectId, projectFilter) : undefined,
        term ? ilike(documents.name, `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`) : undefined
      )
    )
    .orderBy(desc(documents.updatedAt))
    .limit(300);

  const manageable = new Set<string>();
  for (const r of rows) if (await canManageDocument(viewer, r.d)) manageable.add(r.d.id);

  const [clientOptions, projectOptions] = await Promise.all([
    viewer.isInternal ? db.select({ id: clients.id, name: clients.companyName }).from(clients).where(and(clientScope(viewer), ne(clients.status, 'inactive'))).orderBy(asc(clients.companyName)) : Promise.resolve([]),
    db.select({ id: projects.id, name: projects.name, clientId: projects.clientId }).from(projects).where(and(projectScope(viewer), ne(projects.status, 'cancelled'))).orderBy(asc(projects.name)),
  ]);
  const storageReady = storageDriver() !== 'none';

  return (
    <>
      <PageHeader
        eyebrow="Secure storage"
        title="Documents"
        description={viewer.isInternal ? 'Private files with versions and access control. Clients only ever see files shared with their account.' : 'Files shared between your team and Isha Technologies.'}
      />
      <Panel className="mb-6" title="Upload" description="Max 25 MB per file. Files are private and only reachable through signed, expiring links.">
        {storageReady ? (
          <UploadPanel isInternal={viewer.isInternal} canManage={can(viewer, 'documents.manage')} clients={clientOptions} projects={projectOptions} defaultClientId={clientFilter} />
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">File storage is not configured. Set the S3_* environment variables (see docs/portal/SETUP.md).</p>
        )}
      </Panel>
      <Panel>
        <form className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={term} placeholder="Search documents" className={cn(inputClass, 'py-2 pl-9')} />
          </div>
          {viewer.isInternal && clientOptions.length > 0 && (
            <select name="client" defaultValue={clientFilter ?? ''} className={cn(inputClass, 'py-2 sm:w-52')}>
              <option value="">All clients</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <select name="project" defaultValue={projectFilter ?? ''} className={cn(inputClass, 'py-2 sm:w-52')}>
            <option value="">All projects</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand">Filter</button>
        </form>
        {focus && (
          <p className="mb-3 text-xs text-slate-500">
            Showing one document · <Link href="/portal/documents" className="font-semibold text-brand">Show all</Link>
          </p>
        )}
        {rows.length === 0 ? (
          <EmptyState icon={FolderLock} title="No documents" description="Uploaded files you have access to will appear here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Belongs to</Th>
                <Th>Uploaded</Th>
                {viewer.isInternal && <Th>Access</Th>}
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ d, clientName, projectName, uploader, size }) => {
                const kind = fileKindFor(d.name);
                const canEdit = manageable.has(d.id);
                return (
                  <Tr key={d.id} className={focus === d.id ? 'bg-brand/[0.04]' : ''}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <DocIcon name={d.name} />
                        <div className="min-w-0">
                          <p className="max-w-[280px] truncate font-medium text-slate-900">{d.name}</p>
                          <p className="text-xs text-slate-500">
                            {humanize(d.category)} · v{d.currentVersion}
                            {size ? ` · ${fileSize(size)}` : ''}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="block text-slate-800">{projectName ?? (clientName ? 'Account-wide' : 'Internal')}</span>
                      {viewer.isInternal && <span className="block text-xs text-slate-500">{clientName ?? 'Isha Technologies'}</span>}
                    </Td>
                    <Td>
                      <span className="block text-slate-800">{fmtDate(d.updatedAt)}</span>
                      <span className="block text-xs text-slate-500">{uploader ?? '—'}</span>
                    </Td>
                    {viewer.isInternal && (
                      <Td>
                        {d.visibility === 'client' ? (
                          <Badge tone="brand">
                            <Eye className="h-3 w-3" /> Client
                          </Badge>
                        ) : (
                          <Badge tone="slate">
                            <Lock className="h-3 w-3" /> Internal
                          </Badge>
                        )}
                      </Td>
                    )}
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        {kind?.previewable && <PreviewButton id={d.id} name={d.name} kind={kind.previewable} />}
                        <a href={`/api/portal/documents/${d.id}/download`} aria-label={`Download ${d.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-slate-500 hover:border-brand hover:text-brand">
                          <Download className="h-4 w-4" />
                        </a>
                        <VersionsButton id={d.id} name={d.name} canUpload={canEdit} />
                        {canEdit && <EditDocumentButton doc={{ id: d.id, name: d.name, category: d.category, visibility: d.visibility, hasClient: Boolean(d.clientId) }} />}
                        {canEdit && <DeleteDocumentButton id={d.id} name={d.name} />}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {!viewer.isInternal && (
          <p className="mt-4 text-xs text-slate-500">
            Need a document renamed, replaced or removed? <Link href="/portal/change-requests" className="font-semibold text-brand">Submit a change request</Link>.
          </p>
        )}
      </Panel>
    </>
  );
}
