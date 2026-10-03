import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, leads, projectMembers, projects, proposalItems, proposals, tasks } from '@/server/db/schema';
import type { Viewer } from '@/server/auth/viewer';
import { audit, recordActivity } from '@/server/audit';
import { clientUserIds, notifyUsers } from '@/server/notify';
import { nextCounter } from '@/server/settings';

type Lead = typeof leads.$inferSelect;
type Proposal = typeof proposals.$inferSelect;

/**
 * Lead → client. Idempotent: a lead that already converted returns its
 * client. The lead is marked won and both timelines record the hand-off.
 */
export async function ensureClientFromLead(viewer: Viewer, lead: Lead): Promise<string> {
  if (lead.convertedClientId) return lead.convertedClientId;
  const n = await nextCounter('client');
  const [client] = await db
    .insert(clients)
    .values({
      code: `CL-${String(n).padStart(4, '0')}`,
      companyName: lead.company || lead.name,
      contactName: lead.name,
      email: lead.email,
      phone: lead.phone,
      status: 'onboarding',
      accountManagerId: lead.assignedTo,
      leadId: lead.id,
    })
    .returning({ id: clients.id });
  await db.update(leads).set({ status: 'won', convertedClientId: client.id }).where(eq(leads.id, lead.id));
  await recordActivity({ entityType: 'lead', entityId: lead.id, leadId: lead.id, actorId: viewer.id, summary: 'Converted to client — onboarding started' });
  await recordActivity({ entityType: 'client', entityId: client.id, clientId: client.id, actorId: viewer.id, summary: `Client created from lead ${lead.name}` });
  await audit(viewer, 'lead.converted', { entityType: 'lead', entityId: lead.id, metadata: { clientId: client.id } });
  return client.id;
}

/**
 * Accepted proposal → live project. Creates the client first when the
 * proposal was written for a lead, seeds one internal task per line item,
 * puts the owner on the team and links everything back to the proposal.
 */
export async function convertProposalToProject(viewer: Viewer, proposal: Proposal): Promise<{ projectId: string; clientId: string }> {
  let clientId = proposal.clientId;
  if (!clientId) {
    if (!proposal.leadId) throw new Error('Proposal has neither a client nor a lead.');
    const [lead] = await db.select().from(leads).where(eq(leads.id, proposal.leadId));
    if (!lead) throw new Error('Lead not found.');
    clientId = await ensureClientFromLead(viewer, lead);
  }
  const items = await db.select().from(proposalItems).where(eq(proposalItems.proposalId, proposal.id)).orderBy(proposalItems.position);
  const n = await nextCounter('project');
  const code = `PRJ-${String(n).padStart(4, '0')}`;
  const ownerId = proposal.ownerId ?? viewer.id;

  const [project] = await db
    .insert(projects)
    .values({
      code,
      name: proposal.title.slice(0, 160),
      clientId,
      description: proposal.summary || `Created from proposal ${proposal.number}.`,
      status: 'planning',
      // The budget column is in INR paise; other currencies are tracked on the proposal/invoices instead.
      budgetPaise: proposal.currency === 'INR' ? proposal.totalPaise : 0,
      createdBy: viewer.id,
    })
    .returning();
  await db.insert(projectMembers).values({ projectId: project.id, userId: ownerId, memberType: 'team', isLead: true }).onConflictDoNothing();
  if (items.length) {
    await db.insert(tasks).values(
      items.slice(0, 50).map((it) => ({
        projectId: project.id,
        title: it.description.slice(0, 200),
        description: `From proposal ${proposal.number}.`,
        visibility: 'internal' as const,
        createdBy: viewer.id,
      }))
    );
  }
  await db.update(proposals).set({ status: 'converted', clientId, projectId: project.id }).where(and(eq(proposals.id, proposal.id)));
  if (proposal.leadId) await db.update(leads).set({ status: 'won' }).where(eq(leads.id, proposal.leadId));

  await recordActivity({ entityType: 'project', entityId: project.id, projectId: project.id, clientId, actorId: viewer.id, summary: `Project created from proposal ${proposal.number}` });
  await audit(viewer, 'proposal.converted', { entityType: 'proposal', entityId: proposal.id, metadata: { projectId: project.id, clientId } });
  await notifyUsers([ownerId], { type: 'project.created', title: `Project ${code} is ready`, body: `${project.name} was created from proposal ${proposal.number}.`, link: `/portal/projects/${project.id}`, priority: 'high' }, { actorId: viewer.id });
  await notifyUsers(await clientUserIds(clientId), { type: 'project.created', title: `Your project ${project.name} is starting`, body: `Proposal ${proposal.number} was accepted — we're setting the project up.`, link: `/portal/projects/${project.id}` }, { actorId: viewer.id });
  return { projectId: project.id, clientId };
}
