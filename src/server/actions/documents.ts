'use server';

import { randomUUID } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { clients, documentVersions, documents, pendingUploads, users } from '@/server/db/schema';
import { requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { canManageDocument, findVisibleDocument, resolveUploadTarget, type ResolvedTarget } from '@/server/documents';
import { inspectObject, presignUpload, storageDriver } from '@/server/storage';
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
  | { ok: true; uploadId: string; method: 'PUT'; url: string; headers: Record<string, string> }
  | { ok: false; error: string };

/**
 * Step 1 of an upload: authorise the target, validate type and size, and
 * hand back a one-time upload URL (presigned S3 PUT, or the local dev route).
 */
export async function initUploadAction(input: z.infer<typeof initSchema>): Promise<InitUploadResult> {
  try {
    const viewer = await requireViewerOrThrow();
    const parsed = initSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Invalid upload request.' };
    const { fileName, size, target: req } = parsed.data;

    if (storageDriver() === 'none') return { ok: false, error: 'File storage is not configured yet (set the S3_* environment variables).' };
    const kind = fileKindFor(fileName);
    if (!kind) return { ok: false, error: 'This file type is not allowed. Use PDF, Word, Excel, CSV, PNG, JPG or ZIP.' };
    const { maxUploadMb } = await getSetting('storage');
    if (size > maxUploadMb * 1024 * 1024) return { ok: false, error: `Files must be ${maxUploadMb} MB or smaller.` };

    const target = await resolveUploadTarget(viewer, req);
    if (!target) return { ok: false, error: 'You can’t upload files here.' };

    const key = `${target.clientId ?? 'internal'}/${randomUUID()}/${safeFileName(fileName)}`;
    const [pending] = await db
      .insert(pendingUploads)
      .values({ userId: viewer.id, storageKey: key, fileName: fileName.slice(0, 200), mimeType: kind.mime, sizeBytes: size, target, expiresAt: new Date(Date.now() + 15 * 60 * 1000) })
      .returning({ id: pendingUploads.id });

    const presigned = await presignUpload(key, kind.mime, size);
    if (presigned) return { ok: true, uploadId: pending.id, method: 'PUT', url: presigned.url, headers: presigned.headers };
    const token = signToken({ uploadId: pending.id, userId: viewer.id }, 15 * 60);
    return { ok: true, uploadId: pending.id, method: 'PUT', url: `/api/portal/uploads/${pending.id}?token=${encodeURIComponent(token)}`, headers: { 'Content-Type': kind.mime } };
  } catch (error) {
    console.error('initUpload failed', error);
    return { ok: false, error: 'Could not start the upload.' };
  }
}

/** Step 2: verify what actually landed in storage, then create the document / version. */
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

    const kind = fileKindFor(pending.fileName)!;
    const object = await inspectObject(pending.storageKey);
    if (!object) return { error: 'The file did not finish uploading.' };
    if (object.size !== pending.sizeBytes) return { error: 'Uploaded file size did not match. Please retry.' };
    if (!matchesSignature(kind, object.head)) return { error: `The file content is not a valid ${kind.label} file.` };

    const target = pending.target as ResolvedTarget;
    const version = await createDocumentVersion(viewer, target, pending);
    return { ok: true, message: version.isNew ? 'Uploaded.' : `Version ${version.version} uploaded.`, data: { id: version.documentId } };
  });
}

async function createDocumentVersion(viewer: Viewer, target: ResolvedTarget, pending: typeof pendingUploads.$inferSelect) {
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

