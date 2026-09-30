import 'server-only';
import { and, asc, eq, sql, type SQL } from 'drizzle-orm';
import { db } from '@/server/db';
import { projectMembers, projects, tasks, users } from '@/server/db/schema';
import { can, type Viewer } from '@/server/auth/viewer';
import { taskScope } from '@/server/scope';
import type { BoardTask } from '@/components/portal/tasks/KanbanBoard';

/** Tasks for boards/lists, scoped to the viewer, with per-task edit rights resolved server-side. */
export async function boardTasks(v: Viewer, where?: SQL, limit = 500): Promise<BoardTask[]> {
  const commentFilter = v.isInternal ? sql`true` : sql`c.is_internal = false`;
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      project: projects.name,
      assigneeId: tasks.assigneeId,
      assignee: users.name,
      visibility: tasks.visibility,
      checklistDone: sql<number>`(select count(*)::int from task_checklist_items ci where ci.task_id = ${tasks.id} and ci.is_done)`,
      checklistTotal: sql<number>`(select count(*)::int from task_checklist_items ci where ci.task_id = ${tasks.id})`,
      comments: sql<number>`(select count(*)::int from task_comments c where c.task_id = ${tasks.id} and ${commentFilter})`,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(and(taskScope(v), where))
    .orderBy(asc(tasks.position), asc(tasks.dueDate))
    .limit(limit);

  const manageAll = can(v, 'tasks.manage');
  const memberOf = v.isInternal && !manageAll
    ? new Set((await db.select({ id: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, v.id))).map((r) => r.id))
    : new Set<string>();

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    priority: r.priority,
    dueDate: r.dueDate,
    project: r.project,
    assignee: r.assignee,
    visibility: r.visibility,
    checklistDone: r.checklistDone,
    checklistTotal: r.checklistTotal,
    comments: r.comments,
    editable: v.isInternal && (manageAll || r.assigneeId === v.id || memberOf.has(r.projectId)),
  }));
}
