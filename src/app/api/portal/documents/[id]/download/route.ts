import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { documentVersions } from '@/server/db/schema';
import { getViewer } from '@/server/auth/viewer';
import { findVisibleDocument } from '@/server/documents';
import { isUuid } from '@/server/scope';
import { presignDownload, readLocal, storageDriver } from '@/server/storage';
import { audit } from '@/server/audit';
import { fileKindFor } from '@/lib/portal/file-types';

export const runtime = 'nodejs';

/**
 * GET /api/portal/documents/:id/download?v=<version>&inline=1
 *
 * The only way to fetch a document's bytes. Authorises with the same
 * document scope as every listing (unknown or foreign ids → 404, never
 * 403, so ids can't be probed), audits the download, then either
 * redirects to a 60-second presigned S3 URL or streams the local file.
 * Inline display is limited to PDFs and images, served with a sandboxing CSP.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const doc = await findVisibleDocument(viewer, id);
  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const url = new URL(request.url);
  const requested = Number(url.searchParams.get('v'));
  const [version] = await db
    .select()
    .from(documentVersions)
    .where(and(eq(documentVersions.documentId, id), Number.isInteger(requested) && requested > 0 ? eq(documentVersions.version, requested) : undefined))
    .orderBy(desc(documentVersions.version))
    .limit(1);
  if (!version) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const kind = fileKindFor(version.fileName);
  const inline = url.searchParams.get('inline') === '1' && Boolean(kind?.previewable);
  if (!inline) {
    await audit(viewer, 'document.downloaded', { entityType: 'document', entityId: id, metadata: { version: version.version } });
  }

  if (storageDriver() === 's3') {
    const signed = await presignDownload(version.storageKey, version.fileName, version.mimeType, inline);
    return NextResponse.redirect(signed, { status: 302, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const bytes = await readLocal(version.storageKey).catch(() => null);
  if (!bytes) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': version.mimeType,
      'Content-Length': String(bytes.length),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(version.fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      // Images are fully sandboxed; PDFs skip 'sandbox' because Chrome's PDF viewer refuses to render in sandboxed documents.
      'Content-Security-Policy': kind?.previewable === 'pdf' ? "default-src 'none'; frame-ancestors 'self'" : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'; sandbox",
    },
  });
}
