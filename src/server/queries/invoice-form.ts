import 'server-only';
import { asc, ne } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, projects } from '@/server/db/schema';
import { getSetting } from '@/server/settings';
import { GST_STATES } from '@/lib/portal/invoice-math';

/** Data the invoice editor needs (caller must already hold invoices.manage). */
export async function invoiceFormData() {
  const [clientRows, projectRows, invoice, tax, currencies] = await Promise.all([
    db.select().from(clients).where(ne(clients.status, 'inactive')).orderBy(asc(clients.companyName)),
    db.select({ id: projects.id, name: projects.name, clientId: projects.clientId }).from(projects).where(ne(projects.status, 'cancelled')).orderBy(asc(projects.name)),
    getSetting('invoice'),
    getSetting('tax'),
    getSetting('currencies'),
  ]);
  return {
    clients: clientRows.map((c) => ({
      id: c.id,
      name: c.companyName,
      billingName: c.legalName || c.companyName,
      billingAddress: [c.addressLine1, c.addressLine2, [c.city, c.state, c.postalCode].filter(Boolean).join(', '), c.country].filter(Boolean).join('\n'),
      gstin: c.gstin,
      stateCode: c.gstin?.slice(0, 2) ?? GST_STATES.find((s) => s.name === c.state)?.code ?? null,
      // Clients outside India default to international invoices.
      international: Boolean(c.country && !/^india$/i.test(c.country.trim())),
    })),
    projects: projectRows,
    defaults: {
      currency: invoice.defaultCurrency,
      dueDays: invoice.defaultDueDays,
      terms: invoice.defaultTerms,
      notes: invoice.defaultNotes,
      prefix: invoice.prefix,
      gstRates: tax.gstRates,
      taxRatePct: tax.defaultTaxRatePct,
      sacCode: tax.sacCode,
      supplierStateCode: tax.stateCode,
      internationalTaxLabel: tax.internationalTaxLabel,
      internationalTaxRatePct: tax.internationalTaxRatePct,
      symbols: currencies,
    },
  };
}
