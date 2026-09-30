import 'server-only';
import { and, asc, eq, ne } from 'drizzle-orm';
import { db } from '@/server/db';
import { clientUsers, clients, users } from '@/server/db/schema';
import type { Viewer } from '@/server/auth/viewer';
import { userScope } from '@/server/scope';

/** Active internal users visible to the viewer (for assignee / manager pickers). */
export async function internalPeople(v: Viewer) {
  if (!v.isInternal) return [];
  return db
    .select({ id: users.id, name: users.name, title: users.title, role: users.role })
    .from(users)
    .where(and(ne(users.role, 'client'), eq(users.isActive, true), userScope(v)))
    .orderBy(asc(users.name));
}

/** Active client users (with their company), scoped to the viewer. */
export async function clientPeople(v: Viewer, clientId?: string) {
  return db
    .select({ id: users.id, name: users.name, clientId: clientUsers.clientId, company: clients.companyName })
    .from(users)
    .innerJoin(clientUsers, eq(clientUsers.userId, users.id))
    .innerJoin(clients, eq(clients.id, clientUsers.clientId))
    .where(and(eq(users.isActive, true), userScope(v), clientId ? eq(clientUsers.clientId, clientId) : undefined))
    .orderBy(asc(users.name));
}
