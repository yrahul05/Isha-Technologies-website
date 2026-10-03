import 'server-only';
import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, contracts, renewalItems } from '@/server/db/schema';
import { can, ForbiddenError, type Viewer } from '@/server/auth/viewer';
import { daysFromToday, urgencyOf, type Urgency } from '@/lib/portal/proposals';
import { todayIST } from '@/lib/portal/format';

export type RenewalRow = {
  source: 'item' | 'contract';
  id: string;
  name: string;
  kind: string;
  client: string | null;
  clientId: string | null;
  expiresOn: string;
  daysLeft: number;
  urgency: Urgency;
  costPaise: number;
  currency: string;
  autoRenew: boolean;
  vendor: string | null;
  remindDays: number;
  notes: string;
  href: string | null;
};

/**
 * Everything that expires, soonest first: tracked items (domains, SSL,
 * licences…) plus active contracts with an end date. Internal only.
 */
export async function renewalCenter(viewer: Viewer): Promise<RenewalRow[]> {
  if (!viewer.isInternal || !can(viewer, 'renewals.view')) throw new ForbiddenError();
  const today = todayIST();
  const [items, contractRows] = await Promise.all([
    db
      .select({ r: renewalItems, client: clients.companyName })
      .from(renewalItems)
      .leftJoin(clients, eq(clients.id, renewalItems.clientId))
      .where(inArray(renewalItems.status, ['active']))
      .orderBy(asc(renewalItems.expiresOn)),
    can(viewer, 'contracts.view')
      ? db
          .select({ c: contracts, client: clients.companyName })
          .from(contracts)
          .innerJoin(clients, eq(clients.id, contracts.clientId))
          .where(and(eq(contracts.status, 'active'), isNotNull(contracts.endDate)))
          .orderBy(asc(contracts.endDate))
      : Promise.resolve([]),
  ]);

  const rows: RenewalRow[] = [
    ...items.map(({ r, client }): RenewalRow => ({ source: 'item', id: r.id, name: r.name, kind: r.kind, client, clientId: r.clientId, expiresOn: r.expiresOn, daysLeft: daysFromToday(r.expiresOn, today), urgency: urgencyOf(daysFromToday(r.expiresOn, today)), costPaise: r.costPaise, currency: r.currency, autoRenew: r.autoRenew, vendor: r.vendor, remindDays: r.remindDays, notes: r.notes, href: null })),
    ...contractRows.map(({ c, client }): RenewalRow => ({ source: 'contract', id: c.id, name: c.title, kind: 'contract', client, clientId: c.clientId, expiresOn: c.endDate!, daysLeft: daysFromToday(c.endDate!, today), urgency: urgencyOf(daysFromToday(c.endDate!, today)), costPaise: c.valuePaise, currency: c.currency, autoRenew: c.autoRenew, vendor: null, remindDays: c.renewalNoticeDays, notes: c.notes, href: `/portal/contracts/${c.id}` })),
  ];
  return rows.sort((a, b) => a.daysLeft - b.daysLeft);
}
