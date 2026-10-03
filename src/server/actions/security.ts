'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { sessions, users } from '@/server/db/schema';
import { assertCan, ForbiddenError, requireViewerOrThrow, type Viewer } from '@/server/auth/viewer';
import { audit } from '@/server/audit';
import { notifySecurity } from '@/server/auth/security-notice';
import { getRequestMeta } from '@/server/request';
import { guarded } from './helpers';
import type { ActionState } from './types';

/** Only a Super Admin may act on another Super Admin's sessions. */
async function targetUser(viewer: Viewer, userId: string) {
  const [u] = await db.select({ id: users.id, role: users.role, name: users.name }).from(users).where(eq(users.id, userId));
  if (!u) return null;
  if (u.role === 'super_admin' && !viewer.isSuperAdmin) throw new ForbiddenError('Only a Super Admin can manage a Super Admin’s sessions.');
  return u;
}

/** Security dashboard: sign one device out (any user). */
export async function revokeUserSessionAction(sessionId: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'security.manage');
    if (typeof sessionId !== 'string' || !/^[a-f0-9]{64}$/.test(sessionId)) return { error: 'Invalid session.' };
    if (sessionId === viewer.sessionId) return { error: 'Use Sign out for your own current device.' };
    const [s] = await db.select({ userId: sessions.userId }).from(sessions).where(eq(sessions.id, sessionId));
    if (!s) return { ok: true, message: 'That session has already ended.' };
    const user = await targetUser(viewer, s.userId);
    if (!user) return { error: 'User not found.' };
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    const meta = await getRequestMeta();
    await audit(viewer, 'security.session_revoked', { entityType: 'user', entityId: user.id, metadata: { scope: 'single' }, meta });
    if (user.id !== viewer.id) await notifySecurity(user, 'A device was signed out', 'An administrator signed one of your devices out of the Isha Technologies portal. If you didn’t expect this, contact your account manager.', meta);
    revalidatePath('/portal/security');
    return { ok: true, message: `Signed out one of ${user.name}’s devices.` };
  });
}

/** Security dashboard: sign a user out everywhere (e.g. suspected compromise). */
export async function revokeAllUserSessionsAction(userId: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'security.manage');
    if (!z.uuid().safeParse(userId).success) return { error: 'Invalid user.' };
    const user = await targetUser(viewer, userId);
    if (!user) return { error: 'User not found.' };
    // Never cut off the admin's own current session from here.
    const removed = await db
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), ne(sessions.id, viewer.sessionId)))
      .returning({ id: sessions.id });
    const meta = await getRequestMeta();
    await audit(viewer, 'security.session_revoked', { entityType: 'user', entityId: userId, metadata: { scope: 'all', count: removed.length }, meta });
    if (removed.length && user.id !== viewer.id) await notifySecurity(user, 'You were signed out of all devices', 'An administrator signed you out of the Isha Technologies portal on every device. Sign in again to continue. If you didn’t expect this, contact your account manager.', meta);
    revalidatePath('/portal/security');
    return { ok: true, message: removed.length ? `Signed ${user.name} out of ${removed.length} session${removed.length === 1 ? '' : 's'}.` : 'No other active sessions.' };
  });
}
