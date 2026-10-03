'use server';

import { createHash, randomUUID } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { clients, documentVersions, documents, pendingUploads, users } from '@/server/db/schema';
import { requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { canManageDocument, findVisibleDocument, resolveUploadTarget, type ResolvedTarget } from '@/server/documents';
import { storage, type StorageName } from '@/server/storage';
import { scanBuffer } from '@/server/scan';
import { audit, recordActivity } from '@/server/audit';
import { clientUserIds, notifyUsers, projectMemberIds } from '@/server/notify';
import { getSetting } from '@/server/settings';
import { signToken } from '@/server/security/crypto';
import { fileKindFor, matchesSignature, safeFileName } from '@/lib/portal/file-types';
import { guarded } from './helpers';
import type { ActionState } from './types';

const initSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  size: z.number().int().positive(),
  target: z.object({
    documentId: z.uuid().nullish(),
    clientId: z.uuid().nullish(),
    projectId: z.uuid().nullish(),
    taskId: z.uuid().nullish(),
    ticketId: z.uuid().nullish(),
    visibility: z.enum(['internal', 'client']).optional(),
    category: z.string().max(40).optional(),
  }),
});

export type InitUploadResult =
  | { ok: true; uploadId: string; plan: ClientUploadPlan }
  | { ok: false; error: string };

/** What the browser needs to send the bytes (never includes server credentials). */
export type ClientUploadPlan =
  | { mode: 'proxy'; url: string; partSize: number; parts: number }
  | { mode: 'presigned'; url: string; headers: Record<string, string> }
  | { mode: 'blob-client'; pathname: string; clientToken: string; contentType: string };

/**
 * Step 1 of an upload: authorise the target, validate type and size, and
 * hand back a one-time upload plan for the configured StorageProvider
 * (chunked PUTs to our own route, a presigned S3 PUT, or a Vercel Blob
 * client token restricted to one pathname, content type and size).
 */
export async function initUploadAction(input: z.infer<typeof initSchema>): Promise<InitUploadResult> {
  try {
    const viewer = await requireViewerOrThrow();
    const parsed = initSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Invalid upload request.' };
    const { fileName, size, target: req } = parsed.data;

    const kind = fileKindFor(fileName);
    if (!kind) return { ok: false, error: 'This file type is not allowed. Use PDF, Word, Excel, CSV, PNG, JPG or ZIP.' };
    const { maxUploadMb } = await getSetting('storage');
    if (size > maxUploadMb * 1024 * 1024) return { ok: false, error: `Files must be ${maxUploadMb} MB or smaller.` };

    const target = await resolveUploadTarget(viewer, req);
    if (!target) return { ok: false, error: 'You can’t upload files here.' };

    const provider = storage();
    // Random, unguessable key; the user-supplied name is sanitised and only kept for readability.
    const key = `documents/${target.clientId ?? 'internal'}/${randomUUID()}/${safeFileName(fileName)}`;
    const [pending] = await db
      .insert(pendingUploads)
      .values({ userId: viewer.id, storageKey: key, fileName: fileName.slice(0, 200), mimeType: kind.mime, sizeBytes: size, target: { ...target, driver: provider.name }, expiresAt: new Date(Date.now() + 15 * 60 * 1000) })
      .returning({ id: pendingUploads.id });

    const plan = await provider.prepareUpload(key, kind.mime, size);
    if (plan.mode === 'proxy') {
      const token = signToken({ uploadId: pending.id, userId: viewer.id }, 15 * 60);
      return { ok: true, uploadId: pending.id, plan: { mode: 'proxy', url: `/api/portal/uploads/${pending.id}?token=${encodeURIComponent(token)}`, partSize: plan.partSize, parts: Math.max(1, Math.ceil(size / plan.partSize)) } };
    }
    return { ok: true, uploadId: pending.id, plan };
  } catch (error) {
    console.error('initUpload failed', error instanceof Error ? error.message : error);
    return { ok: false, error: 'Could not start the upload.' };
  }
}

/**
 * Step 2: verify what actually landed in storage (exact size, file
 * signature, malware scan when a scanner is configured), then create the
 * document / version. Anything that fails verification is deleted.
 */
export async function finalizeUploadAction(uploadId: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!z.uuid().safeParse(uploadId).success) return { error: 'Invalid upload.' };
    const [pending] = await db
      .select()
      .from(pendingUploads)
      .where(and(eq(pendingUploads.id, uploadId), eq(pendingUploads.userId, viewer.id), gt(pendingUploads.expiresAt, new Date())));
    if (!pending) return { error: 'Upload expired. Please try again.' };
    await db.delete(pendingUploads).where(eq(pendingUploads.id, uploadId));
    await db.delete(pendingUploads).where(lt(pendingUploads.expiresAt, new Date()));

    const { driver, ...target } = pending.target as ResolvedTarget & { driver: StorageName };
    const provider = storage(driver);
    const reject = async (error: string): Promise<ActionState> => {
      await provider.delete(pending.storageKey).catch(() => undefined);
      return { error };
    };

    const kind = fileKindFor(pending.fileName)!;
    const object = await provider.inspect(pending.storageKey);
    if (!object) return { error: 'The file did not finish uploading.' };
    if (object.size !== pending.sizeBytes) return reject('Uploaded file size did not match. Please retry.');
    if (!matchesSignature(kind, object.head)) return reject(`The file content is not a valid ${kind.label} file.`);

    // Full read for the checksum and (optional) malware scan — bounded by the declared size.
    const bytes = await provider.readAll(pending.storageKey, pending.sizeBytes);
    if (!bytes) return reject('The file could not be verified. Please retry.');
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const scan = await scanBuffer(bytes);
    if (scan.status === 'infected') {
      await audit(viewer, 'document.scan_blocked', { entityType: 'document', entityId: target.documentId ?? undefined, metadata: { fileName: pending.fileName, signature: scan.signature } });
      return reject('This file was flagged by the malware scanner and was not uploaded.');
    }
    if (scan.status === 'error' && process.env.CLAMAV_REQUIRED === '1') return reject('The malware scanner is unavailable. Please try again shortly.');

    const version = await createDocumentVersion(viewer, target, pending, { driver: provider.name, checksum, scanStatus: scan.status === 'clean' ? 'clean' : 'not_scanned' });
    return { ok: true, message: version.isNew ? 'Uploaded.' : `Version ${version.version} uploaded.`, data: { id: version.documentId } };
  });
}

/** Archive / restore a document (hidden from default listings, kept for the retention period). */
export async function archiveDocumentAction(id: string, archive: boolean): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const doc = z.uuid().safeParse(id).success ? await findVisibleDocument(viewer, id) : null;
    if (!doc || !(await canManageDocument(viewer, doc))) return { error: 'You can’t change this document.' };
    await db.update(documents).set({ archivedAt: archive ? new Date() : null }).where(eq(documents.id, doc.id));
    await audit(viewer, archive ? 'document.archived' : 'document.restored', { entityType: 'document', entityId: doc.id, metadata: { name: doc.name } });
    revalidatePath('/portal/documents');
    return { ok: true, message: archive ? 'Document archived.' : 'Document restored.' };
  });
}

async function createDocumentVersion(viewer: Viewer, target: ResolvedTarget, pending: typeof pendingUploads.$inferSelect, stored: { driver: StorageName; checksum: string; scanStatus: 'clean' | 'not_scanned' }) {
  let documentId = target.documentId;
  let version = 1;
  const isNew = !documentId;
  if (documentId) {
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
    version = doc.currentVersion + 1;
    await db.update(documents).set({ currentVersion: version }).where(eq(documents.id, documentId));
  } else {
    const [doc] = await db
      .insert(documents)
      .values({
        name: pending.fileName,
        category: target.category,
        clientId: target.clientId,
        projectId: target.projectId,
        taskId: target.taskId,
        ticketId: target.ticketId,
        visibility: target.visibility,
        uploadedBy: viewer.id,
      })
      .returning({ id: documents.id });
    documentId = doc.id;
  }
  await db.insert(documentVersions).values({
    documentId: documentId!,
    version,
    storageKey: pending.storageKey,
    fileName: pending.fileName,
    mimeType: pending.mimeType,
    sizeBytes: pending.sizeBytes,
    checksumSha256: stored.checksum,
    storageDriver: stored.driver,
    scanStatus: stored.scanStatus,
    uploadedBy: viewer.id,
  });

  await audit(viewer, isNew ? 'document.uploaded' : 'document.version_uploaded', { entityType: 'document', entityId: documentId!, metadata: { version, fileName: pending.fileName, size: pending.sizeBytes } });
  const label = isNew ? `Uploaded “${pending.fileName}”` : `Uploaded version ${version} of “${pending.fileName}”`;
  await recordActivity({ entityType: 'document', entityId: documentId!, clientId: target.clientId, projectId: target.projectId, actorId: viewer.id, summary: label, visibility: target.visibility });

  // Notify: client-visible uploads by the team → the client's users; uploads by a client → the project team / account manager.
  const recipients: string[] = [];
  if (viewer.isInternal) {
    if (target.visibility === 'client' && target.clientId) recipients.push(...(target.projectId ? await projectMemberIds(target.projectId, 'client') : await clientUserIds(target.clientId)));
    if (target.projectId) recipients.push(...(await projectMemberIds(target.projectId, 'team')));
  } else {
    if (target.projectId) recipients.push(...(await projectMemberIds(target.projectId, 'team')));
    if (target.clientId) {
      const [c] = await db.select({ am: clients.accountManagerId }).from(clients).where(eq(clients.id, target.clientId));
      if (c?.am) recipients.push(c.am);
    }
  }
  await notifyUsers(recipients, { type: 'document.uploaded', title: 'Document uploaded', body: `${pending.fileName} · by ${viewer.name}`, link: `/portal/documents?doc=${documentId}` }, { actorId: viewer.id });

  revalidatePath('/portal/documents');
  if (target.projectId) revalidatePath(`/portal/projects/${target.projectId}`);
  if (target.taskId) revalidatePath(`/portal/tasks/${target.taskId}`);
  if (target.ticketId) revalidatePath(`/portal/tickets/${target.ticketId}`);
  return { documentId: documentId!, version, isNew };
}

const editSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, 'Enter a name.').max(200),
  category: z.string().max(40).default('general'),
  visibility: z.enum(['internal', 'client']),
});

export async function updateDocumentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = editSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: 'Please check the fields.' };
    const doc = await findVisibleDocument(viewer, parsed.data.id);
    if (!doc || !(await canManageDocument(viewer, doc))) return { error: 'You can’t edit this document.' };
    // Internal company documents (no client) can never be shared.
    const visibility = doc.clientId ? parsed.data.visibility : 'internal';
    await db.update(documents).set({ name: parsed.data.name, category: parsed.data.category, visibility }).where(eq(documents.id, doc.id));
    if (doc.name !== parsed.data.name) await audit(viewer, 'document.renamed', { entityType: 'document', entityId: doc.id, metadata: { from: doc.name, to: parsed.data.name } });
    if (doc.visibility !== visibility) await recordActivity({ entityType: 'document', entityId: doc.id, clientId: doc.clientId, projectId: doc.projectId, actorId: viewer.id, summary: `${visibility === 'client' ? 'Shared' : 'Unshared'} “${parsed.data.name}”`, visibility: 'internal' });
    revalidatePath('/portal/documents');
    return { ok: true, message: 'Saved.' };
  });
}

export async function deleteDocumentAction(id: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const doc = z.uuid().safeParse(id).success ? await findVisibleDocument(viewer, id) : null;
    if (!doc || !(await canManageDocument(viewer, doc))) return { error: 'You can’t delete this document.' };
    // Soft delete: versions stay in storage for recovery and the audit trail.
    await db.update(documents).set({ deletedAt: new Date() }).where(eq(documents.id, id));
    await audit(viewer, 'document.deleted', { entityType: 'document', entityId: id, metadata: { name: doc.name } });
    revalidatePath('/portal/documents');
    return { ok: true, message: 'Document deleted.' };
  });
}

/** Version history for the document drawer (scoped). */
export async function documentVersionsAction(id: string) {
  const viewer = await requireViewerOrThrow();
  const doc = z.uuid().safeParse(id).success ? await findVisibleDocument(viewer, id) : null;
  if (!doc) return [];
  return db
    .select({ version: documentVersions.version, fileName: documentVersions.fileName, sizeBytes: documentVersions.sizeBytes, createdAt: documentVersions.createdAt, by: users.name })
    .from(documentVersions)
    .leftJoin(users, eq(users.id, documentVersions.uploadedBy))
    .where(eq(documentVersions.documentId, id))
    .orderBy(documentVersions.version);
}

