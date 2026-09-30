'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/server/db';
import { clientNotes, clients } from '@/server/db/schema';
import { assertCan, requireViewerOrThrow } from '@/server/auth/viewer';
import { revokeAllSessions } from '@/server/auth/session';
import { audit, recordActivity } from '@/server/audit';
import { nextCounter } from '@/server/settings';
import { clientUserIds } from '@/server/notify';
import { isValidGstin } from '@/lib/portal/invoice-math';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const clientSchema = z.object({
  companyName: z.string().trim().min(2, 'Enter the company name.').max(160),
  legalName: opt(200),
  contactName: z.string().trim().min(2, 'Enter a contact person.').max(120),
  email: z.email('Enter a valid email.').max(254),
  phone: opt(40),
  addressLine1: opt(200),
  addressLine2: opt(200),
  city: opt(80),
  state: opt(80),
  postalCode: opt(20),
  country: z.string().trim().max(80).default('India'),
  gstin: opt(15)
    .transform((v) => (v ? v.toUpperCase() : v))
    .refine((v) => !v || isValidGstin(v), 'That GSTIN doesn’t look valid (15 characters, e.g. 08ABCDE1234F1Z5).'),
  pan: opt(10).transform((v) => (v ? v.toUpperCase() : v)),
  industry: opt(80),
  website: opt(200),
  accountManagerId: z
    .union([z.literal(''), z.uuid()])
    .optional()
    .transform((v) => v || null),
  status: z.enum(['active', 'inactive', 'onboarding']).default('active'),
});

export async function createClientAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const result = await guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'clients.manage');
    const parsed = parseForm(clientSchema, form);
    if (parsed.error) return parsed.error;
    const n = await nextCounter('client');
    const [row] = await db
      .insert(clients)
      .values({ ...parsed.data, code: `CL-${String(n).padStart(4, '0')}` })
      .returning({ id: clients.id });
    await audit(viewer, 'client.created', { entityType: 'client', entityId: row.id, metadata: { companyName: parsed.data.companyName } });
    await recordActivity({ entityType: 'client', entityId: row.id, clientId: row.id, actorId: viewer.id, summary: `Client ${parsed.data.companyName} created` });
    revalidatePath('/portal/clients');
    return { ok: true, data: { id: row.id } };
  });
  if (result.ok && result.data?.id) redirect(`/portal/clients/${result.data.id}`);
  return result;
}

export async function updateClientAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'clients.manage');
    const id = z.uuid().safeParse(form.get('id'));
    if (!id.success) return { error: 'Invalid client.' };
    const parsed = parseForm(clientSchema, form);
    if (parsed.error) return parsed.error;
    const [before] = await db.select().from(clients).where(eq(clients.id, id.data));
    if (!before) return { error: 'Client not found.' };

    await db.update(clients).set(parsed.data).where(eq(clients.id, id.data));
    const changed = Object.keys(parsed.data).filter((k) => String(before[k as keyof typeof before] ?? '') !== String(parsed.data[k as keyof typeof parsed.data] ?? ''));

    // Deactivating a client locks every one of its users out immediately.
    if (before.status !== 'inactive' && parsed.data.status === 'inactive') {
      for (const uid of await clientUserIds(id.data)) await revokeAllSessions(uid);
      await audit(viewer, 'client.deactivated', { entityType: 'client', entityId: id.data });
    } else if (before.status === 'inactive' && parsed.data.status !== 'inactive') {
      await audit(viewer, 'client.activated', { entityType: 'client', entityId: id.data });
    }
    await audit(viewer, 'client.updated', { entityType: 'client', entityId: id.data, metadata: { changed } });
    if (changed.length) await recordActivity({ entityType: 'client', entityId: id.data, clientId: id.data, actorId: viewer.id, summary: `Client details updated (${changed.join(', ')})` });
    revalidatePath(`/portal/clients/${id.data}`);
    revalidatePath('/portal/clients');
    return { ok: true, message: 'Client saved.' };
  });
}

export async function addClientNoteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'clients.view');
    const parsed = parseForm(z.object({ clientId: z.uuid(), body: z.string().trim().min(2, 'Write a note.').max(4000) }), form);
    if (parsed.error) return parsed.error;
    const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, parsed.data.clientId));
    if (!client) return { error: 'Client not found.' };
    await db.insert(clientNotes).values({ clientId: client.id, authorId: viewer.id, body: parsed.data.body });
    revalidatePath(`/portal/clients/${client.id}`);
    return { ok: true, message: 'Note added.' };
  });
}

