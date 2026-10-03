import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { documentVersions } from '@/server/db/schema';
import { getViewer } from '@/server/auth/viewer';
import { findVisibleDocument } from '@/server/documents';
import { isUuid } from '@/server/scope';
import { storage } from '@/server/storage';
import { audit } from '@/server/audit';
import { fileKindFor } from '@/lib/portal/file-types';

export const runtime = 'nodejs';

/**
 * GET /api/portal/documents/:id/download?v=<version>&inline=1
 *
 * The only way to fetch a document's bytes. Authorises with the same
 * document scope as every listing (unknown or foreign ids → 404, never
 * 403, so ids can't be probed), refuses versions flagged by the malware
 * scanner, audits the download, then either redirects to a 60-second
 * presigned URL (S3) or streams the bytes from the provider that stored
 * this version. Inline display is limited to PDFs and images, served with
 * a sandboxing CSP.
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
  if (version.scanStatus === 'infected') return NextResponse.json({ error: 'blocked' }, { status: 451 });

  const kind = fileKindFor(version.fileName);
  const inline = url.searchParams.get('inline') === '1' && Boolean(kind?.previewable);
  if (!inline) {
    await audit(viewer, 'document.downloaded', { entityType: 'document', entityId: id, metadata: { version: version.version } });
  }

  const result = await storage(version.storageDriver).download(version.storageKey, version.fileName, version.mimeType, inline);
  if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ('redirect' in result) return NextResponse.redirect(result.redirect, { status: 302, headers: { 'Cache-Control': 'private, no-store' } });

  return new NextResponse(result.body, {
    headers: {
      'Content-Type': version.mimeType,
      'Content-Length': String(result.size),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(version.fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      // Images are fully sandboxed; PDFs skip 'sandbox' because Chrome's PDF viewer refuses to render in sandboxed documents.
      'Content-Security-Policy': kind?.previewable === 'pdf' ? "default-src 'none'; frame-ancestors 'self'" : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'; sandbox",
    },
  });
}
