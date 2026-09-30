import 'server-only';
import { and, asc, count, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { leads, rolePermissions, users } from '@/server/db/schema';
import { audit, recordActivity } from '@/server/audit';
import { notifyUsers, usersWithPermission } from '@/server/notify';
import { getSetting } from '@/server/settings';

export type Attribution = Partial<Record<'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_term' | 'utm_content' | 'referrer' | 'landingPage' | 'firstSeen', string>>;

const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer', 'landingPage', 'firstSeen'] as const;

/** Keeps only known attribution keys, as short plain strings. */
export function cleanAttribution(raw: unknown): Attribution {
  if (!raw || typeof raw !== 'object') return {};
  const out: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.trim()) out[key] = v.replace(/[<>\u0000-\u001f]/g, '').slice(0, 300);
  }
  return out;
}

/**
 * Picks the salesperson: the configured default assignee, otherwise the
 * active lead-manager with the fewest open leads (round robin by load).
 */
async function pickAssignee(): Promise<string | null> {
  const config = await getSetting('leads');
  if (config.defaultAssigneeId) {
    const [u] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, config.defaultAssigneeId), eq(users.isActive, true)));
    if (u && !config.roundRobin) return u.id;
  }
  const roles = (await db.select({ role: rolePermissions.role }).from(rolePermissions).where(eq(rolePermissions.permission, 'leads.manage'))).map((r) => r.role);
  const eligible = await db
    .select({ id: users.id, open: sql<number>`(select count(*)::int from leads l where l.assigned_to = ${users.id} and l.status not in ('won','lost'))` })
    .from(users)
    .where(and(eq(users.isActive, true), inArray(users.role, [...new Set(['super_admin', ...roles])].filter((r) => r !== 'client') as ('super_admin' | 'admin' | 'employee')[])))
    .orderBy(asc(sql`2`), asc(users.createdAt));
  return eligible[0]?.id ?? null;
}

export async function createWebsiteLead(input: {
  source: 'website_assessment' | 'contact_form';
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  serviceInterested?: string | null;
  notes?: string;
  assessment?: Record<string, unknown> | null;
  attribution?: Attribution;
}): Promise<{ id: string; assignedTo: string | null }> {
  // De-duplicate: a returning prospect with an open lead gets a new activity, not a second lead.
  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(sql`lower(${leads.email})`, input.email.toLowerCase()), notInArray(leads.status, ['won', 'lost'])))
    .limit(1);

  const label = input.source === 'website_assessment' ? 'Free DevOps & Cloud Assessment' : 'website contact form';
  if (existing) {
    await db
      .update(leads)
      .set({
        assessment: input.assessment ?? existing.assessment,
        notes: [existing.notes, input.notes].filter(Boolean).join('\n\n').slice(0, 8000),
        serviceInterested: input.serviceInterested ?? existing.serviceInterested,
      })
      .where(eq(leads.id, existing.id));
    await recordActivity({ entityType: 'lead', entityId: existing.id, leadId: existing.id, summary: `Submitted the ${label} again` });
    await notifyUsers([existing.assignedTo], { type: 'lead.updated', title: `${existing.name} came back via the ${label}`, body: existing.company ?? existing.email, link: `/portal/leads/${existing.id}`, priority: 'high' });
    return { id: existing.id, assignedTo: existing.assignedTo };
  }

  const assignedTo = await pickAssignee();
  const [lead] = await db
    .insert(leads)
    .values({
      name: input.name,
      email: input.email,
      company: input.company || null,
      phone: input.phone || null,
      source: input.source,
      serviceInterested: input.serviceInterested || null,
      notes: input.notes ?? '',
      assessment: input.assessment ?? null,
      attribution: input.attribution ?? {},
      assignedTo,
      followUpAt: new Date(Date.now() + 24 * 3_600_000),
    })
    .returning();

  await recordActivity({ entityType: 'lead', entityId: lead.id, leadId: lead.id, summary: `Lead captured from the ${label}${input.attribution?.utm_source ? ` (utm_source: ${input.attribution.utm_source})` : ''}` });
  await audit(null, 'lead.created', { entityType: 'lead', entityId: lead.id, metadata: { source: input.source } });
  const recipients = new Set<string>([...(assignedTo ? [assignedTo] : []), ...(await usersWithPermission('leads.view'))]);
  await notifyUsers(recipients, { type: 'lead.created', title: `New ${input.source === 'website_assessment' ? 'assessment' : 'website'} lead: ${lead.name}`, body: [lead.company, lead.serviceInterested].filter(Boolean).join(' · '), link: `/portal/leads/${lead.id}`, priority: 'high' });
  return { id: lead.id, assignedTo };
}

export async function openLeadCount(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(leads).where(notInArray(leads.status, ['won', 'lost']));
  return row?.n ?? 0;
}
