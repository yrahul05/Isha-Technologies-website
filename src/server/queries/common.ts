import 'server-only';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { projectMembers, tasks, users } from '@/server/db/schema';

/** Task-completion progress per project (completed / total, excluding nothing — internal tasks count too). */
export async function projectProgress(projectIds: string[]): Promise<Map<string, { done: number; total: number; pct: number }>> {
  const map = new Map<string, { done: number; total: number; pct: number }>();
  if (projectIds.length === 0) return map;
  const rows = await db
    .select({
      projectId: tasks.projectId,
      total: count(),
      done: sql<number>`count(*) filter (where ${tasks.status} = 'completed')::int`,
    })
    .from(tasks)
    .where(inArray(tasks.projectId, projectIds))
    .groupBy(tasks.projectId);
  for (const id of projectIds) map.set(id, { done: 0, total: 0, pct: 0 });
  for (const r of rows) map.set(r.projectId, { done: r.done, total: r.total, pct: r.total ? Math.round((r.done / r.total) * 100) : 0 });
  return map;
}

/** Team members (names) per project, for avatar stacks. */
export async function projectTeams(projectIds: string[]): Promise<Map<string, { id: string; name: string; type: 'team' | 'client'; isLead: boolean }[]>> {
  const map = new Map<string, { id: string; name: string; type: 'team' | 'client'; isLead: boolean }[]>();
  if (projectIds.length === 0) return map;
  const rows = await db
    .select({ projectId: projectMembers.projectId, id: users.id, name: users.name, type: projectMembers.memberType, isLead: projectMembers.isLead })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(inArray(projectMembers.projectId, projectIds));
  for (const r of rows) map.set(r.projectId, [...(map.get(r.projectId) ?? []), { id: r.id, name: r.name, type: r.type, isLead: r.isLead }]);
  return map;
}

export function sumInt<T extends { [k: string]: unknown }>(rows: T[], key: keyof T): number {
  return rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);
}

export const notCompleted = sql`${tasks.status} <> 'completed'`;

export function andAll(...parts: Parameters<typeof and>) {
  return and(...parts)!;
}
