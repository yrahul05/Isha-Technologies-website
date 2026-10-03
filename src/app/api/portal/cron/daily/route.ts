import { NextResponse } from 'next/server';
import { and, eq, inArray, isNull, lt, lte, ne, notInArray, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { invoices, leads, loginAttempts, pendingUploads, projects, tasks } from '@/server/db/schema';
import { purgeExpiredSessions } from '@/server/auth/session';
import { clientUserIds, notifyUsers, usersWithPermission } from '@/server/notify';
import { recordActivity } from '@/server/audit';
import { safeEqual } from '@/server/security/crypto';
import { formatMoney } from '@/lib/portal/invoice-math';
import { todayIST } from '@/lib/portal/format';
import { runWorkflows } from '@/server/workflows';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/portal/cron/daily — scheduled by vercel.json (09:00 IST).
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is 401.
 *  1. Invoices past their due date → status overdue; client + finance notified once.
 *  2. Tasks due tomorrow → assignee reminded ("deadline approaching").
 *  3. Lead follow-ups due today → salesperson reminded (once per follow-up).
 *  4. Housekeeping: expired sessions, stale uploads, old login attempts.
 *  5. Automated workflows (src/server/workflows.ts): due-soon / overdue invoice nudges,
 *     proposal expiry & follow-ups, contract and renewal reminders, meeting-minutes and
 *     timesheet reminders — each sent once via reminder_log.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') ?? '';
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const today = todayIST();
  const tomorrow = todayIST(1);
  const summary: Record<string, number> = {};

  // 1. Overdue invoices (status flips exactly once, so each is announced once).
  const overdue = await db
    .update(invoices)
    .set({ status: 'overdue' })
    .where(and(inArray(invoices.status, ['sent', 'partially_paid']), lt(invoices.dueDate, today), sql`${invoices.paidPaise} < ${invoices.totalPaise}`))
    .returning();
  const finance = await usersWithPermission('invoices.manage');
  for (const inv of overdue) {
    const due = formatMoney(inv.totalPaise - inv.paidPaise, inv.currency);
    await notifyUsers(await clientUserIds(inv.clientId), { type: 'invoice.overdue', title: `Invoice ${inv.number} is overdue`, body: `${due} was due on ${inv.dueDate}`, link: `/portal/invoices/${inv.id}`, priority: 'high' });
    await notifyUsers(finance, { type: 'invoice.overdue', title: `Overdue: ${inv.number}`, body: `${inv.billingName} · ${due}`, link: `/portal/invoices/${inv.id}`, priority: 'high' });
    await recordActivity({ entityType: 'invoice', entityId: inv.id, clientId: inv.clientId, summary: `Invoice ${inv.number} became overdue`, visibility: 'client' });
  }
  summary.overdueInvoices = overdue.length;

  // 2. Task deadlines approaching.
  const dueSoon = await db
    .select({ id: tasks.id, title: tasks.title, assigneeId: tasks.assigneeId, project: projects.name })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(eq(tasks.dueDate, tomorrow), ne(tasks.status, 'completed')));
  for (const t of dueSoon) await notifyUsers([t.assigneeId], { type: 'task.deadline', title: 'Task due tomorrow', body: `${t.title} · ${t.project}`, link: `/portal/tasks/${t.id}`, priority: 'high' });
  summary.taskReminders = dueSoon.length;

  // 3. Lead follow-ups due today, each reminded once.
  const endOfToday = new Date(`${today}T23:59:59+05:30`);
  const followUps = await db
    .update(leads)
    .set({ followUpNotifiedAt: new Date() })
    .where(and(lte(leads.followUpAt, endOfToday), isNull(leads.followUpNotifiedAt), notInArray(leads.status, ['won', 'lost'])))
    .returning();
  for (const l of followUps) await notifyUsers([l.assignedTo], { type: 'lead.follow_up', title: `Follow up with ${l.name}`, body: l.company ?? l.email, link: `/portal/leads/${l.id}`, priority: 'high' });
  summary.leadFollowUps = followUps.length;

  // 4. Housekeeping.
  await purgeExpiredSessions();
  await db.delete(pendingUploads).where(lt(pendingUploads.expiresAt, new Date()));
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 7 * 86_400_000)));

  // 5. Workflows (isolated: a failing step is logged and reported as -1, never aborts the run).
  const workflows = await runWorkflows(today);

  return NextResponse.json({ ok: true, date: today, ...summary, workflows });
}
