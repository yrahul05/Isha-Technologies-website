import 'server-only';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, invoiceItems, invoices, payments, projects, users } from '@/server/db/schema';
import type { Viewer } from '@/server/auth/viewer';
import { invoiceScope, isUuid } from '@/server/scope';
import { deriveInvoiceStatus } from '@/lib/portal/invoice-math';

/** One invoice with its lines and payments — or null if the viewer may not see it. */
export async function getVisibleInvoice(v: Viewer, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({ inv: invoices, clientName: clients.companyName, projectName: projects.name })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(and(eq(invoices.id, id), invoiceScope(v)))
    .limit(1);
  if (!row) return null;
  const [items, paymentRows] = await Promise.all([
    db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).orderBy(asc(invoiceItems.position)),
    db
      .select({ p: payments, by: users.name })
      .from(payments)
      .leftJoin(users, eq(users.id, payments.recordedBy))
      .where(eq(payments.invoiceId, id))
      .orderBy(desc(payments.paidOn)),
  ]);
  return {
    ...row,
    status: deriveInvoiceStatus(row.inv),
    items,
    payments: paymentRows,
  };
}
