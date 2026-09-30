import 'server-only';
import { and, asc, inArray, ne } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, projects } from '@/server/db/schema';
import { can, type Viewer } from '@/server/auth/viewer';
import { clientScope, memberProjectIds, projectScope } from '@/server/scope';
import { clientPeople, internalPeople } from './people';
import { getGoogleAccount, isGoogleConfigured } from '@/server/google';

/** Options for the meeting form, limited to what this organiser may schedule. */
export async function meetingFormData(v: Viewer) {
  const manage = can(v, 'meetings.manage');
  const [projectRows, team, people, google] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name, clientId: projects.clientId })
      .from(projects)
      .where(and(projectScope(v), ne(projects.status, 'cancelled'), manage ? undefined : inArray(projects.id, memberProjectIds(v))))
      .orderBy(asc(projects.name)),
    internalPeople(v),
    clientPeople(v),
    getGoogleAccount(v.id),
  ]);
  const clientIds = [...new Set(projectRows.map((p) => p.clientId))];
  const clientRows = manage
    ? await db.select({ id: clients.id, name: clients.companyName }).from(clients).where(and(clientScope(v), ne(clients.status, 'inactive'))).orderBy(asc(clients.companyName))
    : clientIds.length
      ? await db.select({ id: clients.id, name: clients.companyName }).from(clients).where(inArray(clients.id, clientIds))
      : [];
  return {
    clients: clientRows,
    projects: projectRows,
    team,
    clientPeople: people,
    googleEmail: google?.googleEmail ?? null,
    googleConfigured: isGoogleConfigured(),
  };
}
