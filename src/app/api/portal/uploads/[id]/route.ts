import { NextResponse } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/server/db';
import { pendingUploads } from '@/server/db/schema';
import { getViewer } from '@/server/auth/viewer';
import { verifyToken } from '@/server/security/crypto';
import { storageDriver, writeLocal } from '@/server/storage';
import { isSameOrigin } from '@/server/request';

export const runtime = 'nodejs';

/**
 * PUT /api/portal/uploads/:id?token=… — local-storage upload target
 * (development only; production uploads go straight to S3 via presigned
 * URL). Requires the session, a same-origin request, the HMAC token issued
 * by initUploadAction for this user + upload, and the exact declared size.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (storageDriver() !== 'local') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const token = verifyToken<{ uploadId: string; userId: string }>(new URL(request.url).searchParams.get('token'));
  if (!token || token.uploadId !== id || token.userId !== viewer.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const [pending] = await db
    .select()
    .from(pendingUploads)
    .where(and(eq(pendingUploads.id, id), eq(pendingUploads.userId, viewer.id), gt(pendingUploads.expiresAt, new Date())));
  if (!pending) return NextResponse.json({ error: 'expired' }, { status: 410 });

  const body = Buffer.from(await request.arrayBuffer());
  if (body.length !== pending.sizeBytes) return NextResponse.json({ error: 'size_mismatch' }, { status: 400 });
  try {
    await writeLocal(pending.storageKey, body);
  } catch {
    return NextResponse.json({ error: 'conflict' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
