import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { getViewer } from '@/server/auth/viewer';
import { isUuid, userScope } from '@/server/scope';
import { storage } from '@/server/storage';

export const runtime = 'nodejs';

/**
 * GET /api/portal/avatars/:userId — profile photo, visible only to people
 * who may see that user at all (same userScope as every people listing:
 * a client sees their colleagues and their project team, nobody else).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { userId } = await params;
  if (!isUuid(userId)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const [row] = await db.select({ avatarKey: users.avatarKey }).from(users).where(and(eq(users.id, userId), userScope(viewer)));
  if (!row?.avatarKey) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const i = row.avatarKey.indexOf(':');
  const provider = storage(row.avatarKey.slice(0, i));
  const bytes = await provider.readAll(row.avatarKey.slice(i + 1), 2 * 1024 * 1024);
  if (!bytes) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const mime = bytes[0] === 0x89 ? 'image/png' : bytes[0] === 0xff ? 'image/jpeg' : 'image/webp';
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(bytes.length),
      // URL carries a version suffix, so a private hour of caching is safe.
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
