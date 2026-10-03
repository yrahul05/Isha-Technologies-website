import 'server-only';
import { and, between, eq, inArray, isNotNull, lt, lte, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, contracts, employees, invoices, meetings, proposals, renewalItems, reminderLog, timeEntries, users } from '@/server/db/schema';
import { clientUserIds, notifyUsers, usersWithPermission } from '@/server/notify';
import { recordActivity } from '@/server/audit';
import { formatMoney } from '@/lib/portal/invoice-math';
import { daysFromToday } from '@/lib/portal/proposals';
import { addDays, weekStart } from '@/lib/portal/time';

/**
 * Automated reminders & workflows, run by the daily cron after the core
 * jobs. Every reminder is claimed in `reminder_log` first (unique on
 * kind + entity + window), so a retried or double-fired cron never sends
 * the same nudge twice — and a failure part-way simply resumes next run.
 */
async function claim(kind: string, entityId: string, windowKey = ''): Promise<boolean> {
  const rows = await db.insert(reminderLog).values({ kind, entityId, windowKey }).onConflictDoNothing().returning({ id: reminderLog.id });
  return rows.length > 0;
}

export async function runWorkflows(today: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const steps: [string, (today: string) => Promise<number>][] = [
    ['invoiceDueSoon', invoiceDueSoon],
    ['overdueFollowUps', overdueFollowUps],
    ['proposalsExpired', expireProposals],
    ['proposalFollowUps', proposalFollowUps],
    ['contractsExpiring', contractsExpiring],
    ['renewalReminders', renewalReminders],
    ['minutesReminders', minutesReminders],
    ['timesheetReminders', timesheetReminders],
  ];
  // One failing step must not starve the others.
  for (const [name, fn] of steps) {
    try {
      out[name] = await fn(today);
    } catch (error) {
      out[name] = -1;
      console.error(`workflow ${name} failed`, error instanceof Error ? error.message : error);
    }
  }
  return out;
}

/** Friendly heads-up 3 days before an invoice falls due. */
async function invoiceDueSoon(today: string) {
  const rows = await db
    .select()
    .from(invoices)
    .where(and(inArray(invoices.status, ['sent', 'partially_paid']), between(invoices.dueDate, today, addDays(today, 3)), sql`${invoices.paidPaise} < ${invoices.totalPaise}`));
  let n = 0;
  for (const inv of rows) {
    if (!(await claim('invoice.due_soon', inv.id, inv.dueDate))) continue;
    const left = daysFromToday(inv.dueDate, today);
    await notifyUsers(await clientUserIds(inv.clientId), { type: 'invoice.due_soon', title: `Invoice ${inv.number} is due ${left === 0 ? 'today' : `in ${left} day${left === 1 ? '' : 's'}`}`, body: `${formatMoney(inv.totalPaise - inv.paidPaise, inv.currency)} due by ${inv.dueDate}`, link: `/portal/invoices/${inv.id}`, priority: 'high' });
    n++;
  }
  return n;
}

/** Escalating nudges at 7, 14 and 30 days overdue — to the client, and to finance at 14+. */
async function overdueFollowUps(today: string) {
  const rows = await db.select().from(invoices).where(and(eq(invoices.status, 'overdue'), sql`${invoices.paidPaise} < ${invoices.totalPaise}`));
  const finance = await usersWithPermission('invoices.manage');
  let n = 0;
  for (const inv of rows) {
    const late = -daysFromToday(inv.dueDate, today);
    const band = [30, 14, 7].find((d) => late >= d);
    if (!band || !(await claim('invoice.overdue_followup', inv.id, `d${band}`))) continue;
    const due = formatMoney(inv.totalPaise - inv.paidPaise, inv.currency);
    await notifyUsers(await clientUserIds(inv.clientId), { type: 'invoice.overdue', title: `Reminder: invoice ${inv.number} is ${late} days overdue`, body: `${due} is outstanding. Please pay or contact us if there is an issue.`, link: `/portal/invoices/${inv.id}`, priority: 'high' });
    if (band >= 14) await notifyUsers(finance, { type: 'invoice.overdue', title: `${late} days overdue: ${inv.number}`, body: `${inv.billingName} · ${due}`, link: `/portal/invoices/${inv.id}`, priority: 'urgent' });
    n++;
  }
  return n;
}

/** Offers past their validity date stop being answerable and the owner is told. */
async function expireProposals(today: string) {
  const rows = await db
    .update(proposals)
    .set({ status: 'expired' })
    .where(and(inArray(proposals.status, ['sent', 'viewed']), lt(proposals.validUntil, today)))
    .returning();
  for (const p of rows) {
    await notifyUsers([p.ownerId], { type: 'proposal.expired', title: `Proposal expired: ${p.title}`, body: `${p.number} was not answered by ${p.validUntil}. Re-quote or follow up.`, link: `/portal/proposals/${p.id}`, priority: 'high' });
    if (p.clientId) await recordActivity({ entityType: 'proposal', entityId: p.id, clientId: p.clientId, summary: `Proposal ${p.number} expired`, visibility: 'internal' });
  }
  return rows.length;
}

/** Sent 3+ days ago and still unanswered → remind the owner once. */
async function proposalFollowUps(today: string) {
  const cutoff = new Date(`${addDays(today, -3)}T23:59:59+05:30`);
  const rows = await db.select().from(proposals).where(and(inArray(proposals.status, ['sent', 'viewed']), lte(proposals.sentAt, cutoff)));
  let n = 0;
  for (const p of rows) {
    if (!(await claim('proposal.follow_up', p.id))) continue;
    await notifyUsers([p.ownerId], { type: 'proposal.follow_up', title: `Follow up on “${p.title}”`, body: `${p.number} has had no decision since ${p.sentAt?.toISOString().slice(0, 10)}${p.viewedAt ? ' (the client has viewed it)' : ''}.`, link: `/portal/proposals/${p.id}`, priority: 'high' });
    n++;
  }
  return n;
}

/** Contracts: notice inside the renewal window, then mark expired once the end date passes. */
async function contractsExpiring(today: string) {
  const active = await db
    .select({ c: contracts, client: clients.companyName })
    .from(contracts)
    .innerJoin(clients, eq(clients.id, contracts.clientId))
    .where(and(eq(contracts.status, 'active'), isNotNull(contracts.endDate)));
  const audience = [...new Set([...(await usersWithPermission('contracts.manage')), ...(await usersWithPermission('renewals.manage'))])];
  let n = 0;
  for (const { c, client } of active) {
    const left = daysFromToday(c.endDate!, today);
    if (left < 0) {
      await db.update(contracts).set({ status: 'expired' }).where(and(eq(contracts.id, c.id), eq(contracts.status, 'active')));
      if (await claim('contract.expired', c.id, c.endDate!)) {
        await notifyUsers(audience, { type: 'contract.expired', title: `Contract expired: ${c.title}`, body: `${client} · ended ${c.endDate}${c.autoRenew ? ' (marked auto-renew — confirm the renewal)' : ''}`, link: `/portal/contracts/${c.id}`, priority: 'urgent' });
        n++;
      }
    } else if (left <= c.renewalNoticeDays && (await claim('contract.renewal_notice', c.id, c.endDate!))) {
      await notifyUsers(audience, { type: 'contract.renewal', title: `Contract renewal due in ${left} day${left === 1 ? '' : 's'}`, body: `${client} · ${c.title}${c.valuePaise ? ` · ${formatMoney(c.valuePaise, c.currency)}` : ''}`, link: `/portal/contracts/${c.id}`, priority: 'high' });
      n++;
    }
  }
  return n;
}

/** Domains/SSL/licences: remind at the configured lead time, a week out, and the day before; then mark lapsed. */
async function renewalReminders(today: string) {
  const items = await db.select().from(renewalItems).where(eq(renewalItems.status, 'active'));
  const managers = await usersWithPermission('renewals.manage');
  let n = 0;
  for (const it of items) {
    const left = daysFromToday(it.expiresOn, today);
    if (left < 0) {
      await db.update(renewalItems).set({ status: 'lapsed' }).where(and(eq(renewalItems.id, it.id), eq(renewalItems.status, 'active')));
      await notifyUsers([it.ownerId, ...managers], { type: 'renewal.lapsed', title: `Lapsed: ${it.name}`, body: `Expired on ${it.expiresOn} and was not renewed.`, link: '/portal/renewals', priority: 'urgent' });
      n++;
      continue;
    }
    const band = [1, 7, it.remindDays].filter((d) => left <= d).sort((a, b) => a - b)[0];
    if (band === undefined || !(await claim('renewal.reminder', it.id, `${it.expiresOn}:${band}`))) continue;
    await notifyUsers([it.ownerId, ...managers], { type: 'renewal.due', title: `${it.name} expires ${left === 0 ? 'today' : `in ${left} day${left === 1 ? '' : 's'}`}`, body: `${it.kind}${it.vendor ? ` · ${it.vendor}` : ''}${it.costPaise ? ` · ${formatMoney(it.costPaise, it.currency)}` : ''}${it.autoRenew ? ' · auto-renews' : ''}`, link: '/portal/renewals', priority: left <= 7 ? 'urgent' : 'high' });
    n++;
  }
  return n;
}

/** Meetings that ended yesterday with no minutes → one nudge to the organiser. */
async function minutesReminders(today: string) {
  const from = new Date(`${addDays(today, -1)}T00:00:00+05:30`);
  const to = new Date(`${today}T00:00:00+05:30`);
  const rows = await db
    .select()
    .from(meetings)
    .where(and(inArray(meetings.status, ['scheduled', 'completed']), between(meetings.startsAt, from, to), eq(meetings.minutes, ''), isNotNull(meetings.organizerId)));
  let n = 0;
  for (const m of rows) {
    if (!(await claim('meeting.minutes', m.id))) continue;
    await notifyUsers([m.organizerId], { type: 'meeting.minutes_due', title: `Add notes for “${m.title}”`, body: 'Capture the decisions and action items while they are fresh.', link: `/portal/meetings/${m.id}` });
    n++;
  }
  return n;
}

/** Fridays: anyone expected to log time who has nothing this week gets a nudge. */
async function timesheetReminders(today: string) {
  if (new Date(`${today}T00:00:00Z`).getUTCDay() !== 5) return 0;
  const start = weekStart(today);
  const eligible = await usersWithPermission('time.log');
  if (eligible.length === 0) return 0;
  const logged = new Set((await db.select({ id: timeEntries.userId }).from(timeEntries).where(and(inArray(timeEntries.userId, eligible), between(timeEntries.workDate, start, today)))).map((r) => r.id));
  // Only people who are actually on a delivery team (have an employee record) and are available.
  const staff = new Set((await db.select({ id: employees.userId }).from(employees).where(and(inArray(employees.userId, eligible), eq(employees.availability, 'available')))).map((r) => r.id));
  const active = new Set((await db.select({ id: users.id }).from(users).where(and(inArray(users.id, eligible), eq(users.isActive, true)))).map((r) => r.id));
  let n = 0;
  for (const id of eligible) {
    if (logged.has(id) || !staff.has(id) || !active.has(id) || !(await claim('time.weekly', id, start))) continue;
    await notifyUsers([id], { type: 'task.timesheet', title: 'Log your time for this week', body: 'You have no time entries yet this week.', link: '/portal/time' });
    n++;
  }
  return n;
}
