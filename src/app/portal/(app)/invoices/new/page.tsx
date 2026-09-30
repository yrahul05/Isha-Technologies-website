import type { Metadata } from 'next';
import { requirePermission } from '@/server/auth/viewer';
import { invoiceFormData } from '@/server/queries/invoice-form';
import { PageHeader } from '@/components/portal/ui';
import { InvoiceEditor } from '@/components/portal/invoices/InvoiceEditor';

export const metadata: Metadata = { title: 'New invoice' };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  await requirePermission('invoices.manage');
  const { client } = await searchParams;
  const data = await invoiceFormData();
  return (
    <>
      <PageHeader eyebrow="Finance" title="New invoice" description="Totals, GST split and the invoice number are calculated on the server when you save." />
      <InvoiceEditor {...data} defaultClientId={client} />
    </>
  );
}
