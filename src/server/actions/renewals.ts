'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { clients, contracts, renewalItems } from '@/server/db/schema';
import { assertCan, ForbiddenError, requireViewerOrThrow } from '@/server/auth/viewer';
import { audit } from '@/server/audit';
import { CURRENCY_CODES, rupeesToPaise } from '@/lib/portal/invoice-math';
import { RENEWAL_KINDS } from '@/lib/portal/proposals';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const optUuid = z
  .union([z.literal(''), z.uuid()])
  .optional()
  .transform((v) => v || null);

const renewalSchema = z.object({
  id: optUuid,
  name: z.string().trim().min(2, 'Name the item, e.g. isha-client.com').max(160),
  kind: z.enum(RENEWAL_KINDS.map((k) => k.value) as [string, ...string[]]),
  clientId: optUuid,
  vendor: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || null),
  expiresOn: z.iso.date('Choose the expiry date.'),
  cost: z.string().optional().transform((v) => (v ? rupeesToPaise(v) : 0)),
  currency: z.enum(CURRENCY_CODES as [string, ...string[]]).default('INR'),
  autoRenew: z
    .string()
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
  remindDays: z.coerce.number().int().min(1).max(365).default(30),
  ownerId: optUuid,
  notes: z.string().max(2000).default(''),
});

export async function saveRenewalAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'renewals.manage');
    const parsed = parseForm(renewalSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    if (d.clientId) {
      const [c] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, d.clientId));
      if (!c) return { fieldErrors: { clientId: 'Client not found.' } };
    }
    const values = { name: d.name, kind: d.kind, clientId: d.clientId, vendor: d.vendor, expiresOn: d.expiresOn, costPaise: d.cost, currency: d.currency, autoRenew: d.autoRenew, remindDays: d.remindDays, ownerId: d.ownerId ?? viewer.id, notes: d.notes };
    if (d.id) {
      await db.update(renewalItems).set(values).where(eq(renewalItems.id, d.id));
      await audit(viewer, 'renewal.updated', { entityType: 'renewal', entityId: d.id });
    } else {
      const [row] = await db.insert(renewalItems).values({ ...values, createdBy: viewer.id }).returning({ id: renewalItems.id });
      await audit(viewer, 'renewal.created', { entityType: 'renewal', entityId: row.id, metadata: { kind: d.kind, expiresOn: d.expiresOn } });
    }
    revalidatePath('/portal/renewals');
    return { ok: true, message: 'Saved.' };
  });
}

/**
 * Mark an item renewed. Renewal items roll forward to the new expiry date;
 * contracts are marked renewed and a fresh end date is applied to the same
 * record so history stays in one place.
 */
export async function renewItemAction(source: 'item' | 'contract', id: string, newExpiry: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, source === 'contract' ? 'contracts.manage' : 'renewals.manage');
    if (!z.uuid().safeParse(id).success || !z.iso.date().safeParse(newExpiry).success) throw new ForbiddenError('Choose a valid new expiry date.');
    const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
    if (newExpiry <= today) return { error: 'The new expiry date must be in the future.' };
    if (source === 'item') {
      const [before] = await db.select().from(renewalItems).where(eq(renewalItems.id, id));
      if (!before) throw new ForbiddenError('Item not found.');
      await db.update(renewalItems).set({ expiresOn: newExpiry, status: 'active' }).where(eq(renewalItems.id, id));
      await audit(viewer, 'renewal.renewed', { entityType: 'renewal', entityId: id, metadata: { from: before.expiresOn, to: newExpiry } });
    } else {
      const [before] = await db.select().from(contracts).where(eq(contracts.id, id));
      if (!before) throw new ForbiddenError('Contract not found.');
      await db.update(contracts).set({ endDate: newExpiry, status: 'active' }).where(eq(contracts.id, id));
      await audit(viewer, 'contract.status_changed', { entityType: 'contract', entityId: id, metadata: { from: before.status, to: 'renewed', endDate: newExpiry } });
    }
    revalidatePath('/portal/renewals');
    revalidatePath('/portal/contracts');
    return { ok: true, message: 'Renewed.' };
  });
}
