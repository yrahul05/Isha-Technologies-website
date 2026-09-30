import { NextResponse } from 'next/server';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/server/db';
import { notifications } from '@/server/db/schema';
import { getViewer } from '@/server/auth/viewer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/portal/notifications — the bell's polling endpoint. Returns the
 * viewer's own latest notifications + unread count (two indexed queries on
 * notifications(user_id, …)). Only ever the viewer's own rows.
 */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [items, [unread]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        link: notifications.link,
        priority: notifications.priority,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, viewer.id))
      .orderBy(desc(notifications.createdAt))
      .limit(15),
    db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, viewer.id), isNull(notifications.readAt))),
  ]);

  return NextResponse.json(
    { unread: unread?.n ?? 0, items, serverTime: new Date().toISOString() },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
