import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, documents, projectMembers, projects, tickets } from '@/server/db/schema';
import { can, type Viewer } from '@/server/auth/viewer';
import { canEditTask, documentScope, findVisibleProject, findVisibleTask, isProjectMember, ticketScope } from '@/server/scope';

export type UploadRequest = {
  documentId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  ticketId?: string | null;
  visibility?: 'internal' | 'client';
  category?: string;
};

export type ResolvedTarget = {
  documentId: string | null;
  clientId: string | null;
  projectId: string | null;
  taskId: string | null;
  ticketId: string | null;
  visibility: 'internal' | 'client';
  category: string;
};

const CATEGORIES = ['general', 'contract', 'proposal', 'architecture', 'report', 'invoice', 'requirements', 'credentials-free', 'other'];

/**
 * Decides whether the viewer may upload to the requested place and returns
 * the canonical target. Ownership (client_id) is always *derived* from the
 * project / task / ticket in the database — never trusted from the request —
 * so a document can't be planted in another client's account.
 */
export async function resolveUploadTarget(v: Viewer, req: UploadRequest): Promise<ResolvedTarget | null> {
  const category = CATEGORIES.includes(req.category ?? '') ? req.category! : 'general';

  // New version of an existing document.
  if (req.documentId) {
    const doc = await findVisibleDocument(v, req.documentId);
    if (!doc || !(await canManageDocument(v, doc))) return null;
    return { documentId: doc.id, clientId: doc.clientId, projectId: doc.projectId, taskId: doc.taskId, ticketId: doc.ticketId, visibility: doc.visibility, category: doc.category };
  }

  if (req.taskId) {
    const task = await findVisibleTask(v, req.taskId);
    if (!task) return null;
    if (v.isInternal && !(await canEditTask(v, task)) && !can(v, 'documents.manage')) return null;
    const [p] = await db.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, task.projectId));
    return { documentId: null, clientId: p.clientId, projectId: task.projectId, taskId: task.id, ticketId: null, visibility: v.isInternal ? (req.visibility ?? task.visibility) : 'client', category };
  }

  if (req.ticketId) {
    const [ticket] = await db.select().from(tickets).where(and(eq(tickets.id, req.ticketId), ticketScope(v)));
    if (!ticket) return null;
    // Ticket attachments are always part of the conversation with the client.
    return { documentId: null, clientId: ticket.clientId, projectId: ticket.projectId, taskId: null, ticketId: ticket.id, visibility: 'client', category: 'general' };
  }

  if (req.projectId) {
    const project = await findVisibleProject(v, req.projectId);
    if (!project) return null;
    if (v.isInternal && !can(v, 'documents.manage') && !(await isProjectMember(v, project.id))) return null;
    return { documentId: null, clientId: project.clientId, projectId: project.id, taskId: null, ticketId: null, visibility: v.isInternal ? (req.visibility ?? 'internal') : 'client', category };
  }

  if (req.clientId) {
    if (v.isInternal) {
      if (!can(v, 'documents.manage')) return null;
      const [c] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, req.clientId));
      if (!c) return null;
      return { documentId: null, clientId: c.id, projectId: null, taskId: null, ticketId: null, visibility: req.visibility ?? 'internal', category };
    }
    if (req.clientId !== v.clientId) return null;
    return { documentId: null, clientId: v.clientId, projectId: null, taskId: null, ticketId: null, visibility: 'client', category };
  }

  // Internal company document (no client) — managers only.
  if (v.isInternal && can(v, 'documents.manage')) {
    return { documentId: null, clientId: null, projectId: null, taskId: null, ticketId: null, visibility: 'internal', category };
  }
  // A client uploading "to my account".
  if (!v.isInternal && v.clientId) {
    return { documentId: null, clientId: v.clientId, projectId: null, taskId: null, ticketId: null, visibility: 'client', category };
  }
  return null;
}

export async function findVisibleDocument(v: Viewer, id: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), documentScope(v)))
    .limit(1);
  return doc ?? null;
}

/**
 * Rename / delete / new version / visibility. Clients never modify
 * documents directly (they submit a change request); internal users need
 * documents.manage, or to be the uploader, or to be on the project.
 */
/**
 * Batch form of canManageDocument for a list page: identical rules, but ONE query for project
 * membership instead of one per row (the list used to await canManageDocument() in a loop).
 */
export async function manageableDocumentIds(v: Viewer, docs: Pick<typeof documents.$inferSelect, 'id' | 'uploadedBy' | 'projectId'>[]): Promise<Set<string>> {
  if (!v.isInternal) return new Set();
  if (can(v, 'documents.manage')) return new Set(docs.map((d) => d.id));
  const projectIds = [...new Set(docs.filter((d) => d.uploadedBy !== v.id && d.projectId).map((d) => d.projectId as string))];
  const member = new Set<string>();
  if (projectIds.length) {
    const rows = await db
      .select({ id: projectMembers.projectId })
      .from(projectMembers)
      .where(and(eq(projectMembers.userId, v.id), inArray(projectMembers.projectId, projectIds)));
    for (const r of rows) member.add(r.id);
  }
  return new Set(docs.filter((d) => d.uploadedBy === v.id || (d.projectId !== null && member.has(d.projectId))).map((d) => d.id));
}

export async function canManageDocument(v: Viewer, doc: typeof documents.$inferSelect): Promise<boolean> {
  if (!v.isInternal) return false;
  if (can(v, 'documents.manage')) return true;
  if (doc.uploadedBy === v.id) return true;
  return doc.projectId ? isProjectMember(v, doc.projectId) : false;
}
