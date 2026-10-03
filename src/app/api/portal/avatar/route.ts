import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { getViewer } from '@/server/auth/viewer';
import { isSameOrigin, metaFromHeaders } from '@/server/request';
import { storage } from '@/server/storage';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';

const MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES: { mime: string; ok: (b: Buffer) => boolean }[] = [
  { mime: 'image/png', ok: (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) },
  { mime: 'image/jpeg', ok: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/webp', ok: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
];

/** Stored as "<driver>:<key>" so reads always use the provider that wrote it. */
function parseAvatarKey(value: string): { driver: string; key: string } {
  const i = value.indexOf(':');
  return { driver: value.slice(0, i), key: value.slice(i + 1) };
}

async function removeStored(avatarKey: string | null) {
  if (!avatarKey) return;
  const { driver, key } = parseAvatarKey(avatarKey);
  await storage(driver).delete(key).catch(() => undefined);
}

/**
 * POST /api/portal/avatar (multipart, field "file") — the signed-in user
 * replaces their OWN profile photo. PNG/JPEG/WebP ≤ 2 MB, verified by
 * file signature (the browser-declared type is ignored). There is no way to
 * set another user's photo.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES + 64 * 1024) return NextResponse.json({ error: 'Photos must be 2 MB or smaller.' }, { status: 413 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Photos must be 2 MB or smaller.' }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = IMAGE_TYPES.find((t) => t.ok(bytes));
  if (!type) return NextResponse.json({ error: 'Use a PNG, JPG or WebP image.' }, { status: 415 });

  const provider = storage();
  const key = `avatars/${viewer.id}/${randomUUID()}`;
  await provider.putObject(key, bytes, type.mime);
  const [before] = await db.select({ avatarKey: users.avatarKey }).from(users).where(eq(users.id, viewer.id));
  await db.update(users).set({ avatarKey: `${provider.name}:${key}` }).where(eq(users.id, viewer.id));
  await removeStored(before?.avatarKey ?? null);
  await audit(viewer, 'user.avatar_changed', { entityType: 'user', entityId: viewer.id, meta: metaFromHeaders(request.headers) });
  revalidatePath('/portal', 'layout');
  return NextResponse.json({ ok: true });
}

/** DELETE /api/portal/avatar — remove your own photo (back to initials). */
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const [before] = await db.select({ avatarKey: users.avatarKey }).from(users).where(eq(users.id, viewer.id));
  await db.update(users).set({ avatarKey: null }).where(eq(users.id, viewer.id));
  await removeStored(before?.avatarKey ?? null);
  await audit(viewer, 'user.avatar_changed', { entityType: 'user', entityId: viewer.id, metadata: { removed: true }, meta: metaFromHeaders(request.headers) });
  revalidatePath('/portal', 'layout');
  return NextResponse.json({ ok: true });
}
