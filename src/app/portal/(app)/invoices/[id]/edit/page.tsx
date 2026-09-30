import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/server/auth/viewer';
import { getVisibleInvoice } from '@/server/queries/invoices';
import { invoiceFormData } from '@/server/queries/invoice-form';
import { PageHeader } from '@/components/portal/ui';
import { InvoiceEditor } from '@/components/portal/invoices/InvoiceEditor';

export const metadata: Metadata = { title: 'Edit invoice' };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requirePermission('invoices.manage');
  const { id } = await params;
  const data = await getVisibleInvoice(viewer, id);
  if (!data || data.status === 'cancelled') notFound();
  const form = await invoiceFormData();
  const inv = data.inv;
  return (
    <>
      <PageHeader eyebrow="Finance" title={`Edit ${inv.number}`} description={data.payments.length ? 'Payments are recorded against this invoice — the total can’t go below the amount already paid.' : undefined} />
      <InvoiceEditor
        {...form}
        initial={{
          id: inv.id,
          status: inv.status,
          clientId: inv.clientId,
          projectId: inv.projectId,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          billingName: inv.billingName,
          billingAddress: inv.billingAddress,
          billingGstin: inv.billingGstin,
          placeOfSupply: inv.placeOfSupply,
          notes: inv.notes,
          terms: inv.terms,
          items: data.items.map((it) => ({
            description: it.description,
            hsnSac: it.hsnSac ?? '',
            quantity: String(it.quantity),
            unitPrice: String(it.unitPricePaise / 100),
            discountPct: String(it.discountPct),
            taxRatePct: String(it.taxRatePct),
          })),
        }}
      />
    </>
  );
}
