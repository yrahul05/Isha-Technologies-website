import 'server-only';
import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, documents, invoices, leads, meetings, projects, tasks, tickets } from '@/server/db/schema';
import type { Viewer } from '@/server/auth/viewer';
import {
  clientScope,
  documentScope,
  invoiceScope,
  leadScope,
  meetingScope,
  projectScope,
  taskScope,
  ticketScope,
} from '@/server/scope';

export type SearchResult = {
  type: 'client' | 'project' | 'task' | 'invoice' | 'document' | 'ticket' | 'meeting' | 'lead';
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const PER_TYPE = 5;

/**
 * Permission-aware global search. Every sub-query ANDs the user's term
 * with the same row-level scope predicate used everywhere else, so search
 * can never surface a record the viewer couldn't open directly.
 */
export async function searchEverything(viewer: Viewer, rawTerm: string): Promise<SearchResult[]> {
  const term = rawTerm.trim().slice(0, 80);
  if (term.length < 2) return [];
  const pattern = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const match = (...cols: Parameters<typeof ilike>[0][]): SQL => or(...cols.map((c) => ilike(c, pattern)))!;

  const [clientRows, projectRows, taskRows, invoiceRows, docRows, ticketRows, meetingRows, leadRows] = await Promise.all([
    db
      .select({ id: clients.id, name: clients.companyName, code: clients.code, contact: clients.contactName })
      .from(clients)
      .where(and(clientScope(viewer), match(clients.companyName, clients.contactName, clients.email, clients.code)))
      .limit(PER_TYPE),
    db
      .select({ id: projects.id, name: projects.name, code: projects.code, status: projects.status })
      .from(projects)
      .where(and(projectScope(viewer), match(projects.name, projects.code)))
      .orderBy(desc(projects.updatedAt))
      .limit(PER_TYPE),
    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, project: projects.name })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(taskScope(viewer), match(tasks.title)))
      .orderBy(desc(tasks.updatedAt))
      .limit(PER_TYPE),
    db
      .select({ id: invoices.id, number: invoices.number, billingName: invoices.billingName, status: invoices.status })
      .from(invoices)
      .where(and(invoiceScope(viewer), match(invoices.number, invoices.billingName)))
      .orderBy(desc(invoices.issueDate))
      .limit(PER_TYPE),
    db
      .select({ id: documents.id, name: documents.name, category: documents.category })
      .from(documents)
      .where(and(documentScope(viewer), match(documents.name)))
      .orderBy(desc(documents.updatedAt))
      .limit(PER_TYPE),
    db
      .select({ id: tickets.id, number: tickets.number, subject: tickets.subject, status: tickets.status })
      .from(tickets)
      .where(and(ticketScope(viewer), match(tickets.subject, tickets.number)))
      .orderBy(desc(tickets.lastActivityAt))
      .limit(PER_TYPE),
    db
      .select({ id: meetings.id, title: meetings.title, startsAt: meetings.startsAt })
      .from(meetings)
      .where(and(meetingScope(viewer), match(meetings.title)))
      .orderBy(desc(meetings.startsAt))
      .limit(PER_TYPE),
    viewer.isInternal
      ? db
          .select({ id: leads.id, name: leads.name, company: leads.company, status: leads.status })
          .from(leads)
          .where(and(leadScope(viewer), match(leads.name, leads.company, leads.email)))
          .limit(PER_TYPE)
      : Promise.resolve([]),
  ]);

  const humanize = (v: string) => v.replace(/_/g, ' ');
  return [
    ...clientRows.map((r) => ({ type: 'client' as const, id: r.id, title: r.name, subtitle: `${r.code} · ${r.contact}`, href: viewer.isInternal ? `/portal/clients/${r.id}` : '/portal/settings' })),
    ...projectRows.map((r) => ({ type: 'project' as const, id: r.id, title: r.name, subtitle: `${r.code} · ${humanize(r.status)}`, href: `/portal/projects/${r.id}` })),
    ...taskRows.map((r) => ({ type: 'task' as const, id: r.id, title: r.title, subtitle: `${r.project} · ${humanize(r.status)}`, href: `/portal/tasks/${r.id}` })),
    ...invoiceRows.map((r) => ({ type: 'invoice' as const, id: r.id, title: r.number, subtitle: `${r.billingName} · ${humanize(r.status)}`, href: `/portal/invoices/${r.id}` })),
    ...docRows.map((r) => ({ type: 'document' as const, id: r.id, title: r.name, subtitle: humanize(r.category), href: `/portal/documents?doc=${r.id}` })),
    ...ticketRows.map((r) => ({ type: 'ticket' as const, id: r.id, title: r.subject, subtitle: `${r.number} · ${humanize(r.status)}`, href: `/portal/tickets/${r.id}` })),
    ...meetingRows.map((r) => ({ type: 'meeting' as const, id: r.id, title: r.title, subtitle: r.startsAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }), href: `/portal/meetings/${r.id}` })),
    ...leadRows.map((r) => ({ type: 'lead' as const, id: r.id, title: r.name, subtitle: `${r.company ?? 'Individual'} · ${humanize(r.status)}`, href: `/portal/leads/${r.id}` })),
  ];
}
