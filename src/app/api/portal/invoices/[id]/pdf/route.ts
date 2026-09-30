import { NextResponse } from 'next/server';
import { getViewer } from '@/server/auth/viewer';
import { getVisibleInvoice } from '@/server/queries/invoices';
import { renderInvoicePdf } from '@/server/pdf/invoice';
import { getSetting } from '@/server/settings';
import { audit } from '@/server/audit';

export const runtime = 'nodejs';

/**
 * GET /api/portal/invoices/:id/pdf — branded PDF, generated on request.
 * Same invoice scope as the UI: other clients' invoices, drafts (for
 * clients) and anything for employees without finance access → 404.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = await getVisibleInvoice(viewer, id);
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [company, tax, invoiceSettings] = await Promise.all([getSetting('company'), getSetting('tax'), getSetting('invoice')]);
  const bytes = await renderInvoicePdf(
    {
      ...data.inv,
      status: data.status,
      projectName: data.projectName,
      items: data.items,
      payments: data.payments.map((r) => ({ paidOn: r.p.paidOn, amountPaise: r.p.amountPaise, method: r.p.method, reference: r.p.reference })),
    },
    company,
    tax,
    invoiceSettings
  );
  await audit(viewer, 'invoice.downloaded', { entityType: 'invoice', entityId: id, metadata: { number: data.inv.number } });

  const inline = new URL(request.url).searchParams.get('inline') === '1';
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${data.inv.number}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
