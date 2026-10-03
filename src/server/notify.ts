import 'server-only';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { after } from 'next/server';
import { db } from '@/server/db';
import { clientUsers, notifications, projectMembers, rolePermissions, users } from '@/server/db/schema';
import { sendTemplate, type EmailCategory } from '@/server/email/templates';
import { categoryOf, type NotificationCategory } from '@/lib/portal/notification-prefs';
import type { Permission } from '@/lib/portal/permissions';

export type NotificationInput = {
  type: string;
  title: string;
  body?: string;
  link?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  announcementId?: string;
  /** Extra lines for the email version (e.g. meeting date, organiser, Meet link). */
  details?: [string, string][];
};

const EMAIL_CATEGORY: Record<NotificationCategory, EmailCategory> = {
  security: 'Account Security',
  meeting: 'Meeting Notification',
  task: 'Task Notification',
  invoice: 'Invoice Notification',
  project: 'Project Update',
  ticket: 'Support',
  announcement: 'Announcement',
  other: 'Notification',
};

/**
 * Deliver an in-portal notification to specific users (deduplicated, only
 * active accounts, never the actor themselves unless `includeActor`).
 * High/urgent items are also emailed after the response is sent, for users
 * who have email notifications on and when email is configured.
 */
export async function notifyUsers(
  userIds: Iterable<string | null | undefined>,
  input: NotificationInput,
  opts: { actorId?: string | null; includeActor?: boolean } = {}
): Promise<number> {
  const ids = [...new Set([...userIds].filter((x): x is string => Boolean(x)))].filter(
    (id) => opts.includeActor || id !== opts.actorId
  );
  if (ids.length === 0) return 0;

  const category = categoryOf(input.type);
  const candidates = await db
    .select({ id: users.id, email: users.email, name: users.name, emailOn: users.emailNotifications, prefs: users.notificationPrefs })
    .from(users)
    .where(and(inArray(users.id, ids), eq(users.isActive, true)));
  // Per-user category preferences; security notices always go through.
  const recipients = candidates.filter((r) => category === 'security' || (r.prefs as Record<string, boolean>)[category] !== false);
  if (recipients.length === 0) return 0;

  await db.insert(notifications).values(
    recipients.map((r) => ({
      userId: r.id,
      type: input.type,
      title: input.title.slice(0, 200),
      body: (input.body ?? '').slice(0, 2000),
      link: input.link,
      priority: input.priority ?? 'normal',
      announcementId: input.announcementId,
      createdBy: opts.actorId ?? null,
    }))
  );

  const priority = input.priority ?? 'normal';
  // Email: high/urgent items for users with email on; security notices always.
  const emailTo = recipients.filter((r) => category === 'security' || ((priority === 'high' || priority === 'urgent') && r.emailOn));
  if (emailTo.length && process.env.EMAIL_API_KEY && process.env.EMAIL_FROM) {
    const send = async () => {
      for (const r of emailTo) {
        await sendTemplate(r.email, {
          category: EMAIL_CATEGORY[category],
          title: input.title,
          intro: input.body ?? '',
          rows: input.details,
          cta: { label: 'Open in portal', href: input.link ?? '/portal/notifications' },
        }).catch(() => undefined);
      }
    };
    try {
      after(send);
    } catch {
      await send(); // outside a request scope (cron / scripts)
    }
  }
  return recipients.length;
}

/** Users holding a permission (internal roles only; super admins always). */
export async function usersWithPermission(permission: Permission): Promise<string[]> {
  const roleRows = await db
    .select({ role: rolePermissions.role })
    .from(rolePermissions)
    .where(eq(rolePermissions.permission, permission));
  const roles = [...new Set(['super_admin', ...roleRows.map((r) => r.role)])].filter((r) => r !== 'client') as (
    | 'super_admin'
    | 'admin'
    | 'employee'
  )[];
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.role, roles), eq(users.isActive, true)));
  return rows.map((r) => r.id);
}

export async function clientUserIds(clientId: string): Promise<string[]> {
  const rows = await db
    .select({ id: clientUsers.userId })
    .from(clientUsers)
    .innerJoin(users, eq(users.id, clientUsers.userId))
    .where(and(eq(clientUsers.clientId, clientId), eq(users.isActive, true)));
  return rows.map((r) => r.id);
}

export async function projectMemberIds(projectId: string, type?: 'team' | 'client'): Promise<string[]> {
  const rows = await db
    .select({ id: projectMembers.userId })
    .from(projectMembers)
    .where(
      type
        ? and(eq(projectMembers.projectId, projectId), eq(projectMembers.memberType, type))
        : eq(projectMembers.projectId, projectId)
    );
  return rows.map((r) => r.id);
}

export async function allInternalUserIds(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(ne(users.role, 'client'), eq(users.isActive, true)));
  return rows.map((r) => r.id);
}

export async function allClientUserIds(): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, 'client'), eq(users.isActive, true)));
  return rows.map((r) => r.id);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Minimal branded HTML email matching the site's existing transactional emails. */
export function portalEmailHtml(title: string, body: string, link: string, cta: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a;">
    <p style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#3478e4;margin:0 0 8px;">Isha Technologies Portal</p>
    <h2 style="font-size:18px;margin:0 0 12px;">${escapeHtml(title)}</h2>
    <p style="font-size:14px;line-height:1.6;white-space:pre-wrap;color:#334155;">${escapeHtml(body)}</p>
    <p style="margin:24px 0;"><a href="${escapeHtml(link)}" style="background:#3478e4;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;">${escapeHtml(cta)}</a></p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
    <p style="font-size:13px;color:#3478e4;font-weight:600;margin:0;">Build. Scale. Automate.</p>
  </div>`;
}
