import { NextResponse } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/server/db';
import { pendingUploads } from '@/server/db/schema';
import { getViewer } from '@/server/auth/viewer';
import { verifyToken } from '@/server/security/crypto';
import { PART_SIZE, storage, type StorageName } from '@/server/storage';
import { isSameOrigin } from '@/server/request';

export const runtime = 'nodejs';

/**
 * PUT /api/portal/uploads/:id?token=…&part=n&parts=N — upload target for
 * providers without direct browser uploads (database, local disk). Bytes
 * arrive in ≤ 4 MB parts (under the serverless request-body limit).
 *
 * Requires the session, a same-origin request and the HMAC token issued by
 * initUploadAction for this user + upload. Each part's size is checked
 * against the declared total, and the last part completes the object.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const url = new URL(request.url);
  const token = verifyToken<{ uploadId: string; userId: string }>(url.searchParams.get('token'));
  if (!token || token.uploadId !== id || token.userId !== viewer.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const [pending] = await db
    .select()
    .from(pendingUploads)
    .where(and(eq(pendingUploads.id, id), eq(pendingUploads.userId, viewer.id), gt(pendingUploads.expiresAt, new Date())));
  if (!pending) return NextResponse.json({ error: 'expired' }, { status: 410 });

  const provider = storage((pending.target as { driver?: StorageName }).driver);
  if (!provider.putPart || !provider.completeParts) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const total = Math.max(1, Math.ceil(pending.sizeBytes / PART_SIZE));
  const part = Number(url.searchParams.get('part') ?? 0);
  if (!Number.isInteger(part) || part < 0 || part >= total) return NextResponse.json({ error: 'bad_part' }, { status: 400 });
  const expected = part === total - 1 ? pending.sizeBytes - PART_SIZE * (total - 1) : PART_SIZE;

  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > expected) return NextResponse.json({ error: 'size_mismatch' }, { status: 413 });
  const body = Buffer.from(await request.arrayBuffer());
  if (body.length !== expected) return NextResponse.json({ error: 'size_mismatch' }, { status: 400 });

  try {
    await provider.putPart(pending.storageKey, part, body);
    if (part === total - 1) await provider.completeParts(pending.storageKey, total);
  } catch (error) {
    console.error('upload part failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'conflict' }, { status: 409 });
  }
  return NextResponse.json({ ok: true, part, total });
}
