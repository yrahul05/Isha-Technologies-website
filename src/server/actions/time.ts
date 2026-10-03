'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/server/db';
import { employees, projects, tasks, timeEntries } from '@/server/db/schema';
import { assertCan, can, ForbiddenError, requireViewerOrThrow } from '@/server/auth/viewer';
import { findVisibleProject, isProjectMember } from '@/server/scope';
import { audit } from '@/server/audit';
import { rupeesToPaise } from '@/lib/portal/invoice-math';
import { MAX_MINUTES_PER_DAY, MAX_MINUTES_PER_ENTRY, parseDuration } from '@/lib/portal/time';
import { todayIST } from '@/lib/portal/format';
import { guarded, parseForm } from './helpers';
import type { ActionState } from './types';

const optUuid = z
  .union([z.literal(''), z.uuid()])
  .optional()
  .transform((v) => v || null);

const entrySchema = z.object({
  projectId: z.uuid('Choose a project.'),
  taskId: optUuid,
  workDate: z.iso.date('Choose the date worked.'),
  duration: z.string().trim().min(1, 'Enter the time spent, e.g. 1.5 or 1:30.'),
  billable: z
    .string()
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
  note: z.string().trim().max(500).default(''),
});

/** Log time against a project the viewer works on. Own time only — nobody logs for someone else. */
export async function logTimeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!viewer.isInternal) throw new ForbiddenError();
    assertCan(viewer, 'time.log');
    const parsed = parseForm(entrySchema, form);
    if (parsed.error) return parsed.error;
    const d = parsed.data;

    const minutes = parseDuration(d.duration);
    if (!minutes) return { fieldErrors: { duration: 'Use hours like 1.5, 1:30 or 90m.' } };
    if (minutes > MAX_MINUTES_PER_ENTRY) return { fieldErrors: { duration: 'A single entry can’t exceed 16 hours.' } };
    const today = todayIST();
    if (d.workDate > today) return { fieldErrors: { workDate: 'You can’t log time in the future.' } };
    if (d.workDate < todayIST(-60)) return { fieldErrors: { workDate: 'Entries older than 60 days must be added by an admin.' } };

    const project = await findVisibleProject(viewer, d.projectId);
    if (!project) throw new ForbiddenError('Project not found.');
    if (!can(viewer, 'tasks.manage') && !(await isProjectMember(viewer, d.projectId))) throw new ForbiddenError('You are not on this project.');
    if (d.taskId) {
      const [t] = await db.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, d.taskId));
      if (!t || t.projectId !== d.projectId) return { fieldErrors: { taskId: 'That task is not on this project.' } };
    }

    const [{ total }] = await db
      .select({ total: sql<number>`coalesce(sum(${timeEntries.minutes}), 0)::int` })
      .from(timeEntries)
      .where(and(eq(timeEntries.userId, viewer.id), eq(timeEntries.workDate, d.workDate)));
    if (total + minutes > MAX_MINUTES_PER_DAY) return { fieldErrors: { duration: 'That would exceed 20 hours logged for the day.' } };

    const [row] = await db.insert(timeEntries).values({ userId: viewer.id, projectId: d.projectId, taskId: d.taskId, workDate: d.workDate, minutes, billable: d.billable, note: d.note }).returning({ id: timeEntries.id });
    await audit(viewer, 'time.logged', { entityType: 'time_entry', entityId: row.id, metadata: { projectId: d.projectId, minutes } });
    revalidatePath('/portal/time');
    return { ok: true, message: 'Time logged.' };
  });
}

/** Delete an entry: your own, or anyone's for holders of time.view_all. */
export async function deleteTimeEntryAction(id: string): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    if (!viewer.isInternal || !z.uuid().safeParse(id).success) throw new ForbiddenError();
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    if (!entry || (entry.userId !== viewer.id && !can(viewer, 'time.view_all'))) throw new ForbiddenError('Entry not found.');
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
    await audit(viewer, 'time.deleted', { entityType: 'time_entry', entityId: id, metadata: { projectId: entry.projectId, minutes: entry.minutes, owner: entry.userId } });
    revalidatePath('/portal/time');
    return { ok: true };
  });
}

const rateSchema = z.object({
  kind: z.enum(['cost', 'bill']),
  targetId: z.uuid(),
  rate: z.string().trim().min(1, 'Enter an hourly rate.'),
});

/** Hourly cost of a team member (team.manage) or billing rate of a project (projects.manage), in rupees. */
export async function setRateAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return guarded(async () => {
    const viewer = await requireViewerOrThrow();
    const parsed = parseForm(rateSchema, form);
    if (parsed.error) return parsed.error;
    const { kind, targetId, rate } = parsed.data;
    const paise = rupeesToPaise(rate);
    if (!Number.isFinite(paise) || paise < 0 || paise > 10_000_000) return { fieldErrors: { rate: 'Enter a valid hourly rate.' } };
    if (kind === 'cost') {
      assertCan(viewer, 'team.manage');
      assertCan(viewer, 'time.view_all');
      await db.insert(employees).values({ userId: targetId, hourlyCostPaise: paise }).onConflictDoUpdate({ target: employees.userId, set: { hourlyCostPaise: paise } });
    } else {
      assertCan(viewer, 'projects.manage');
      await db.update(projects).set({ hourlyRatePaise: paise }).where(eq(projects.id, targetId));
    }
    await audit(viewer, 'settings.updated', { entityType: kind === 'cost' ? 'employee' : 'project', entityId: targetId, metadata: { hourlyPaise: paise, kind } });
    revalidatePath('/portal/profitability');
    return { ok: true, message: 'Rate saved.' };
  });
}
