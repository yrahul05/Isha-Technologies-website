import { NextResponse } from 'next/server';
import { can, getViewer } from '@/server/auth/viewer';
import { auditRows } from '@/server/queries/audit';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';

/** GET /api/portal/audit/export — CSV of the filtered audit log (max 10,000 rows). */
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer || !can(viewer, 'audit.view')) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const sp = new URL(request.url).searchParams;
  const rows = await auditRows({ action: sp.get('action') ?? undefined, actor: sp.get('actor') ?? undefined, from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined, q: sp.get('q') ?? undefined }, 10_000);

  // Neutralise spreadsheet formula injection (=, +, -, @) and quote every cell.
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = ['timestamp_utc', 'actor_email', 'action', 'entity_type', 'entity_id', 'ip', 'user_agent', 'metadata'];
  const lines = [header.join(','), ...rows.map((r) => [r.createdAt.toISOString(), r.actorEmail, r.action, r.entityType, r.entityId, r.ip, r.userAgent, r.metadata].map(cell).join(','))];
  await audit(viewer, 'settings.updated', { entityType: 'audit_export', metadata: { rows: rows.length } });

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
