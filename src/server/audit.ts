import 'server-only';
import { db } from '@/server/db';
import { activities, auditLogs } from '@/server/db/schema';
import { getRequestMeta, type RequestMeta } from '@/server/request';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.login_blocked'
  | 'auth.logout'
  | 'auth.password_reset_requested'
  | 'auth.password_reset'
  | 'auth.password_changed'
  | 'auth.invite_accepted'
  | 'auth.mfa_enabled'
  | 'auth.mfa_disabled'
  | 'user.created'
  | 'user.updated'
  | 'user.activated'
  | 'user.deactivated'
  | 'user.role_changed'
  | 'role.permissions_changed'
  | 'client.created'
  | 'client.updated'
  | 'client.deactivated'
  | 'client.activated'
  | 'project.created'
  | 'project.updated'
  | 'project.members_changed'
  | 'task.created'
  | 'task.updated'
  | 'task.assigned'
  | 'task.deleted'
  | 'document.uploaded'
  | 'document.version_uploaded'
  | 'document.downloaded'
  | 'document.renamed'
  | 'document.deleted'
  | 'invoice.created'
  | 'invoice.updated'
  | 'invoice.sent'
  | 'invoice.cancelled'
  | 'invoice.downloaded'
  | 'payment.recorded'
  | 'ticket.created'
  | 'ticket.updated'
  | 'meeting.scheduled'
  | 'meeting.updated'
  | 'meeting.cancelled'
  | 'google.connected'
  | 'google.disconnected'
  | 'notification.sent'
  | 'announcement.created'
  | 'leave.requested'
  | 'leave.reviewed'
  | 'change_request.created'
  | 'change_request.approved'
  | 'change_request.rejected'
  | 'lead.created'
  | 'lead.updated'
  | 'lead.converted'
  | 'settings.updated';

type Actor = { id: string; email: string } | null;

/**
 * Append a security audit record. Never throws — an audit write failure is
 * logged but must not turn a completed business action into an error.
 */
export async function audit(
  actor: Actor,
  action: AuditAction,
  details: { entityType?: string; entityId?: string; metadata?: Record<string, unknown>; meta?: RequestMeta } = {}
): Promise<void> {
  try {
    const meta = details.meta ?? (await getRequestMeta().catch(() => ({ ip: 'unknown', userAgent: '' })));
    await db.insert(auditLogs).values({
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action,
      entityType: details.entityType,
      entityId: details.entityId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: details.metadata ?? {},
    });
  } catch (error) {
    console.error('audit log write failed', action, error instanceof Error ? error.message : error);
  }
}

/** Business timeline entry (client/project/lead activity feeds). */
export async function recordActivity(entry: {
  entityType: string;
  entityId: string;
  summary: string;
  actorId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  leadId?: string | null;
  visibility?: 'internal' | 'client';
}): Promise<void> {
  try {
    await db.insert(activities).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary.slice(0, 500),
      actorId: entry.actorId ?? null,
      clientId: entry.clientId ?? null,
      projectId: entry.projectId ?? null,
      leadId: entry.leadId ?? null,
      visibility: entry.visibility ?? 'internal',
    });
  } catch (error) {
    console.error('activity write failed', error instanceof Error ? error.message : error);
  }
}
