'use server';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { announcements, clients, users } from '@/server/db/schema';
import { notifications } from '@/server/db/schema';
import { assertCan, requireViewerOrThrow } from '@/server/auth/viewer';
import { allClientUserIds, allInternalUserIds, clientUserIds, notifyUsers } from '@/server/notify';
import { audit } from '@/server/audit';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

/** Mark one (own) notification read/unread. The user_id filter makes other users' rows untouchable. */
export async function setNotificationRead(id: string, read: boolean): Promise<void> {
  const viewer = await requireViewerOrThrow();
  if (!z.uuid().safeParse(id).success) return;
  await db
    .update(notifications)
    .set({ readAt: read ? new Date() : null })
    .where(and(eq(notifications.id, id), eq(notifications.userId, viewer.id)));
  revalidatePath('/portal/notifications');
}

export async function markAllNotificationsRead(): Promise<void> {
  const viewer = await requireViewerOrThrow();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, viewer.id), isNull(notifications.readAt)));
  revalidatePath('/portal/notifications');
}

const arr = z.preprocess((v) => (v === undefined || v === '' ? [] : Array.isArray(v) ? v : [v]), z.array(z.uuid()));

const sendSchema = z
  .object({
    audience: z.enum(['employees', 'clients', 'everyone', 'selected_users', 'selected_clients']),
    userIds: arr,
    clientIds: arr,
    kind: z.enum(['general', 'leave', 'holiday', 'office', 'maintenance', 'emergency']).default('general'),
    title: z.string().trim().min(3, 'Add a title.').max(160),
    body: z.string().trim().min(3, 'Add a message.').max(4000),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    effectiveDate: z.union([z.literal(''), z.iso.date()]).optional(),
    link: z
      .string()
      .trim()
      .max(300)
      .refine((v) => v === '' || v.startsWith('/portal/'), 'Links must point inside the portal.')
      .optional(),
  })
  .refine((d) => d.audience !== 'selected_users' || d.userIds.length > 0, { path: ['userIds'], message: 'Choose at least one person.' })
  .refine((d) => d.audience !== 'selected_clients' || d.clientIds.length > 0, { path: ['clientIds'], message: 'Choose at least one client.' });

/**
 * Targeted notification / announcement. The audience is always explicit —
 * employees only, clients only, specific people or specific client
 * accounts — so internal notices never reach clients by accident.
 */
export async function sendAnnouncementAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'notifications.send');
    const parsed = parseForm(sendSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;

    let recipientIds: string[] = [];
    let audienceLabel = '';
    switch (d.audience) {
      case 'employees':
        recipientIds = await allInternalUserIds();
        audienceLabel = 'All team members';
        break;
      case 'clients':
        recipientIds = await allClientUserIds();
        audienceLabel = 'All clients';
        break;
      case 'everyone':
        recipientIds = [...(await allInternalUserIds()), ...(await allClientUserIds())];
        audienceLabel = 'Everyone';
        break;
      case 'selected_users': {
        const rows = await db.select({ id: users.id, name: users.name }).from(users).where(and(inArray(users.id, d.userIds), eq(users.isActive, true)));
        recipientIds = rows.map((r) => r.id);
        audienceLabel = rows.length === 1 ? rows[0].name : `${rows.length} people`;
        break;
      }
      case 'selected_clients': {
        const rows = await db.select({ id: clients.id, name: clients.companyName }).from(clients).where(inArray(clients.id, d.clientIds));
        for (const c of rows) recipientIds.push(...(await clientUserIds(c.id)));
        audienceLabel = rows.length === 1 ? rows[0].name : `${rows.length} clients`;
        break;
      }
    }
    if (recipientIds.length === 0) return { error: 'No active recipients match that audience.' };

    const [ann] = await db
      .insert(announcements)
      .values({
        kind: d.kind,
        title: d.title,
        body: d.body,
        priority: d.priority,
        effectiveDate: d.effectiveDate || null,
        audienceLabel,
        createdBy: viewer.id,
      })
      .returning({ id: announcements.id });

    const sent = await notifyUsers(
      recipientIds,
      {
        type: d.kind === 'general' ? 'announcement' : `announcement.${d.kind}`,
        title: d.title,
        body: d.body,
        link: d.link || `/portal/announcements#${ann.id}`,
        priority: d.priority,
        announcementId: ann.id,
      },
      { actorId: viewer.id }
    );
    await audit(viewer, 'announcement.created', { entityType: 'announcement', entityId: ann.id, metadata: { audience: audienceLabel, recipients: sent, kind: d.kind } });
    revalidatePath('/portal/announcements');
    return { ok: true, message: `Sent to ${sent} ${sent === 1 ? 'person' : 'people'} (${audienceLabel}).` };
  });
}
