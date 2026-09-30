'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { changeRequests, clients, documents, invoices, projects } from '@/server/db/schema';
import { assertCan, ForbiddenError, requireViewerOrThrow } from '@/server/auth/viewer';
import { audit, recordActivity } from '@/server/audit';
import { notifyUsers, usersWithPermission } from '@/server/notify';
import { CHANGEABLE, ENTITY_LABELS } from '@/lib/portal/change-requests';
import { isValidGstin } from '@/lib/portal/invoice-math';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

type Entity = keyof typeof CHANGEABLE;

/** Loads the target row *only if it belongs to the client*, returning the field's current value. */
async function currentValue(clientId: string, entityType: Entity, entityId: string, field: string): Promise<{ value: unknown; label: string } | null> {
  if (entityType === 'client') {
    if (entityId !== clientId) return null;
    const [c] = await db.select().from(clients).where(eq(clients.id, clientId));
    return c ? { value: c[field as keyof typeof c] ?? null, label: c.companyName } : null;
  }
  if (entityType === 'invoice') {
    const [i] = await db.select().from(invoices).where(and(eq(invoices.id, entityId), eq(invoices.clientId, clientId)));
    return i && i.status !== 'draft' ? { value: i[field as keyof typeof i] ?? null, label: i.number } : null;
  }
  if (entityType === 'project') {
    const [p] = await db.select().from(projects).where(and(eq(projects.id, entityId), eq(projects.clientId, clientId)));
    return p ? { value: p[field as keyof typeof p] ?? null, label: p.name } : null;
  }
  const [d] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, entityId), eq(documents.clientId, clientId), eq(documents.visibility, 'client'), isNull(documents.deletedAt)));
  if (!d) return null;
  return { value: field === 'delete' ? false : d.name, label: d.name };
}

function validateNewValue(entityType: Entity, field: string, raw: string): { value: string | boolean | null } | { error: string } {
  const v = raw.trim();
  if (field === 'delete') return { value: true };
  if ((field === 'gstin' || field === 'billingGstin') && v && !isValidGstin(v)) return { error: 'That GSTIN doesn’t look valid.' };
  if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { error: 'Enter a valid email.' };
  if (field === 'dueDate' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: 'Choose a date.' };
  if (['companyName', 'contactName', 'billingName', 'name'].includes(field) && v.length < 2) return { error: 'This field can’t be empty.' };
  return { value: v ? (field === 'gstin' || field === 'billingGstin' || field === 'pan' ? v.toUpperCase() : v).slice(0, 2000) : null };
}

const submitSchema = z.object({
  entityType: z.enum(['client', 'invoice', 'project', 'document']),
  entityId: z.uuid(),
  field: z.string().max(40),
  newValue: z.string().max(2000).default(''),
  reason: z.string().trim().min(5, 'Tell us why this change is needed.').max(1000),
});

export async function submitChangeRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (viewer.isInternal || !viewer.clientId) throw new ForbiddenError('Change requests are submitted by client users.');
    const parsed = parseForm(submitSchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    if (!(d.field in CHANGEABLE[d.entityType])) return { fieldErrors: { field: 'That field can’t be changed through a request.' } };

    const current = await currentValue(viewer.clientId, d.entityType, d.entityId, d.field);
    if (!current) throw new ForbiddenError();
    const next = validateNewValue(d.entityType, d.field, d.newValue);
    if ('error' in next) return { fieldErrors: { newValue: next.error } };
    if (String(current.value ?? '') === String(next.value ?? '')) return { fieldErrors: { newValue: 'That’s the same as the current value.' } };

    const [cr] = await db
      .insert(changeRequests)
      .values({ clientId: viewer.clientId, requestedBy: viewer.id, entityType: d.entityType, entityId: d.entityId, field: d.field, oldValue: current.value ?? null, newValue: next.value, reason: d.reason })
      .returning({ id: changeRequests.id });
    const fieldLabel = CHANGEABLE[d.entityType][d.field];
    await audit(viewer, 'change_request.created', { entityType: 'change_request', entityId: cr.id, metadata: { entityType: d.entityType, entityId: d.entityId, field: d.field } });
    await recordActivity({ entityType: 'change_request', entityId: cr.id, clientId: viewer.clientId, actorId: viewer.id, summary: `Requested a change to ${fieldLabel.toLowerCase()} (${current.label})`, visibility: 'client' });
    await notifyUsers(await usersWithPermission('change_requests.review'), { type: 'change_request.created', title: `${viewer.clientName}: change request`, body: `${ENTITY_LABELS[d.entityType]} · ${fieldLabel}`, link: '/portal/change-requests', priority: 'high' }, { actorId: viewer.id });
    revalidatePath('/portal/change-requests');
    return { ok: true, message: 'Request submitted. You’ll be notified when it’s reviewed.' };
  });
}

export async function reviewChangeRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    assertCan(viewer, 'change_requests.review');
    const parsed = parseForm(z.object({ id: z.uuid(), decision: z.enum(['approved', 'rejected']), note: z.string().trim().max(1000).optional() }), form);
    if (parsed.error) return parsed.error;
    const { id, decision, note } = parsed.data;

    const outcome = await db.transaction(async (tx) => {
      const [cr] = await tx.select().from(changeRequests).where(eq(changeRequests.id, id)).for('update');
      if (!cr || cr.status !== 'pending') return { error: 'This request has already been reviewed.' };
      // Re-check the allow-list at approval time, not only at submission.
      if (!(cr.entityType in CHANGEABLE) || !(cr.field in CHANGEABLE[cr.entityType as Entity])) return { error: 'This field can no longer be changed by request.' };
      if (decision === 'approved') {
        const value = cr.newValue as string | boolean | null;
        // Apply strictly within the requesting client's own records.
        if (cr.entityType === 'client') await tx.update(clients).set({ [cr.field]: value } as Partial<typeof clients.$inferInsert>).where(eq(clients.id, cr.clientId));
        else if (cr.entityType === 'invoice') await tx.update(invoices).set({ [cr.field]: value } as Partial<typeof invoices.$inferInsert>).where(and(eq(invoices.id, cr.entityId), eq(invoices.clientId, cr.clientId)));
        else if (cr.entityType === 'project') await tx.update(projects).set({ [cr.field]: value } as Partial<typeof projects.$inferInsert>).where(and(eq(projects.id, cr.entityId), eq(projects.clientId, cr.clientId)));
        else if (cr.entityType === 'document') {
          if (cr.field === 'delete') await tx.update(documents).set({ deletedAt: new Date() }).where(and(eq(documents.id, cr.entityId), eq(documents.clientId, cr.clientId)));
          else await tx.update(documents).set({ name: String(value) }).where(and(eq(documents.id, cr.entityId), eq(documents.clientId, cr.clientId)));
        }
      }
      await tx.update(changeRequests).set({ status: decision, reviewedBy: viewer.id, reviewedAt: new Date(), reviewNote: note || null }).where(eq(changeRequests.id, id));
      return { cr };
    });
    if ('error' in outcome) return { error: outcome.error };
    const { cr } = outcome;
    const fieldLabel = CHANGEABLE[cr.entityType as Entity]?.[cr.field] ?? cr.field;

    await audit(viewer, decision === 'approved' ? 'change_request.approved' : 'change_request.rejected', { entityType: 'change_request', entityId: id, metadata: { entityType: cr.entityType, entityId: cr.entityId, field: cr.field, oldValue: cr.oldValue, newValue: cr.newValue } });
    await recordActivity({ entityType: 'change_request', entityId: id, clientId: cr.clientId, actorId: viewer.id, summary: `${decision === 'approved' ? 'Approved' : 'Declined'} change to ${fieldLabel.toLowerCase()}`, visibility: 'client' });
    await notifyUsers([cr.requestedBy], { type: 'change_request.reviewed', title: `Your change request was ${decision}`, body: `${fieldLabel}${note ? ` · ${note}` : ''}`, link: '/portal/change-requests', priority: 'high' }, { actorId: viewer.id });
    revalidatePath('/portal/change-requests');
    return { ok: true, message: `Request ${decision}.` };
  });
}
