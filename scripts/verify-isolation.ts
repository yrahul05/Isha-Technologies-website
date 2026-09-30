/**
 * Tenant-isolation & RBAC verification against the real scope layer and
 * the seeded demo dataset (`npm run db:setup`).
 *
 *   npm run test:isolation
 *
 * For every entity type it resolves exactly which rows each persona can
 * see through src/server/scope.ts (the same predicates every portal page,
 * API route, search and export uses) and asserts the expected boundaries:
 * Client A never sees Client B, employees only see their projects, clients
 * never see internal rows or draft invoices, and a client user with no
 * account sees nothing at all.
 */
import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { closeDb, getDb } from '../src/server/db';
import * as s from '../src/server/db/schema';
import { buildViewer, type Viewer } from '../src/server/auth/viewer';
import * as scope from '../src/server/scope';
import { searchEverything } from '../src/server/queries/search';

const db = getDb();
let failures = 0;
let passes = 0;

function check(label: string, ok: boolean, detail = '') {
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${ok || !detail ? '' : `\n      ${detail}`}`);
}

async function viewerFor(email: string): Promise<Viewer> {
  const [user] = await db.select().from(s.users).where(eq(s.users.email, email));
  if (!user) throw new Error(`Seed user ${email} missing — run npm run db:setup`);
  const v = await buildViewer(user, 'test');
  if (!v) throw new Error(`No viewer for ${email}`);
  return v;
}

async function visible<T extends PgTable>(table: T, predicate: SQL, label: (row: Record<string, unknown>) => string) {
  const rows = (await db.select().from(table as PgTable).where(predicate)) as Record<string, unknown>[];
  return new Set(rows.map(label));
}

function same(actual: Set<string>, expected: string[]) {
  const exp = new Set(expected);
  const ok = actual.size === exp.size && [...exp].every((x) => actual.has(x));
  return { ok, detail: `expected [${[...exp].sort().join(', ')}] got [${[...actual].sort().join(', ')}]` };
}

async function main() {
  const personas = {
    superAdmin: await viewerFor(process.env.SEED_ADMIN_EMAIL || 'admin@ishatechnologies.in'),
    admin: await viewerFor('ops@ishatechnologies.in'),
    aarav: await viewerFor('aarav@ishatechnologies.in'),
    kabir: await viewerFor('kabir@ishatechnologies.in'),
    rohan: await viewerFor('rohan@northwind.example'),
    nisha: await viewerFor('nisha@northwind.example'),
    ananya: await viewerFor('ananya@zenith.example'),
  };
  const orphanClient: Viewer = { ...personas.rohan, id: '00000000-0000-0000-0000-000000000000', clientId: null, clientRole: null };

  const byCode = (r: Record<string, unknown>) => String(r.code);
  const byNumber = (r: Record<string, unknown>) => String(r.number);
  const byTitle = (r: Record<string, unknown>) => String(r.title);
  const byName = (r: Record<string, unknown>) => String(r.companyName ?? r.name);
  const byEmail = (r: Record<string, unknown>) => String(r.email);

  console.log('\nProjects');
  for (const [who, expected] of [
    ['superAdmin', ['PRJ-0001', 'PRJ-0002', 'PRJ-0003']],
    ['admin', ['PRJ-0001', 'PRJ-0002', 'PRJ-0003']],
    ['aarav', ['PRJ-0001', 'PRJ-0002']],
    ['kabir', ['PRJ-0003']],
    ['rohan', ['PRJ-0001', 'PRJ-0002']],
    ['nisha', ['PRJ-0001', 'PRJ-0002']],
    ['ananya', ['PRJ-0003']],
  ] as const) {
    const r = same(await visible(s.projects, scope.projectScope(personas[who]), byCode), [...expected]);
    check(`${who} sees exactly ${expected.join(', ')}`, r.ok, r.detail);
  }
  check('client with no account sees no projects', (await visible(s.projects, scope.projectScope(orphanClient), byCode)).size === 0);

  console.log('\nClients');
  for (const [who, expected] of [
    ['rohan', ['Northwind Logistics']],
    ['ananya', ['Zenith Fintech']],
    ['kabir', ['Zenith Fintech']],
    ['aarav', ['Northwind Logistics']],
    ['admin', ['Northwind Logistics', 'Zenith Fintech']],
  ] as const) {
    const r = same(await visible(s.clients, scope.clientScope(personas[who]), byName), [...expected]);
    check(`${who} sees clients ${expected.join(', ')}`, r.ok, r.detail);
  }

  console.log('\nInvoices & payments (finance)');
  for (const [who, expected] of [
    ['rohan', ['INV-2026-0001', 'INV-2026-0002', 'INV-2026-0003']],
    ['nisha', ['INV-2026-0001', 'INV-2026-0002', 'INV-2026-0003']],
    ['ananya', ['INV-2026-0004']], // INV-2026-0005 is a draft → hidden from the client
    ['aarav', []], // employees have no finance access by default
    ['kabir', []],
    ['admin', ['INV-2026-0001', 'INV-2026-0002', 'INV-2026-0003', 'INV-2026-0004', 'INV-2026-0005']],
  ] as const) {
    const r = same(await visible(s.invoices, scope.invoiceScope(personas[who]), byNumber), [...expected]);
    check(`${who} sees invoices [${expected.join(', ')}]`, r.ok, r.detail);
  }
  const zenithId = (await db.select().from(s.clients).where(eq(s.clients.code, 'CL-0002')))[0].id;
  const northwindId = (await db.select().from(s.clients).where(eq(s.clients.code, 'CL-0001')))[0].id;
  const rohanPayments = await db.select().from(s.payments).where(scope.paymentScope(personas.rohan));
  check('rohan sees only Northwind payments', rohanPayments.length > 0 && rohanPayments.every((p) => p.clientId === northwindId));
  const ananyaPayments = await db.select().from(s.payments).where(scope.paymentScope(personas.ananya));
  check('ananya sees only Zenith payments', ananyaPayments.length > 0 && ananyaPayments.every((p) => p.clientId === zenithId));
  check('employee sees no payments', (await db.select().from(s.payments).where(scope.paymentScope(personas.aarav))).length === 0);

  console.log('\nTasks');
  const clientTasks = await db.select().from(s.tasks).where(scope.taskScope(personas.rohan));
  check('client sees only client-visible tasks', clientTasks.length > 0 && clientTasks.every((t) => t.visibility === 'client'));
  const zsec = (await db.select().from(s.projects).where(eq(s.projects.code, 'PRJ-0003')))[0];
  check('client A sees no Client B task', clientTasks.every((t) => t.projectId !== zsec.id));
  const aaravTasks = await db.select().from(s.tasks).where(scope.taskScope(personas.aarav));
  check('employee on Northwind sees no Zenith task', aaravTasks.length > 0 && aaravTasks.every((t) => t.projectId !== zsec.id));
  const kabirTasks = await db.select().from(s.tasks).where(scope.taskScope(personas.kabir));
  check('employee on Zenith sees only Zenith tasks', kabirTasks.length > 0 && kabirTasks.every((t) => t.projectId === zsec.id));
  const internalTask = (await db.select().from(s.tasks).where(eq(s.tasks.title, 'Internal: cost model for node groups')))[0];
  check('client cannot load an internal task by id', (await scope.findVisibleTask(personas.rohan, internalTask.id)) === null);
  check('other-project employee cannot load task by id', (await scope.findVisibleTask(personas.kabir, internalTask.id)) === null);
  check('other client cannot load project by id', (await scope.findVisibleProject(personas.ananya, internalTask.projectId)) === null);

  console.log('\nTickets');
  for (const [who, expected] of [
    ['rohan', ['TKT-00001', 'TKT-00002']],
    ['ananya', ['TKT-00003']],
    ['kabir', ['TKT-00003']],
    ['aarav', ['TKT-00001', 'TKT-00002']],
  ] as const) {
    const r = same(await visible(s.tickets, scope.ticketScope(personas[who]), byNumber), [...expected]);
    check(`${who} sees tickets ${expected.join(', ')}`, r.ok, r.detail);
  }

  console.log('\nMeetings');
  for (const [who, expected] of [
    ['rohan', ['EKS migration weekly sync']], // owner: all Northwind meetings
    ['nisha', []], // member: only meetings she's invited to
    ['ananya', ['Security findings walkthrough']],
    ['kabir', ['Security findings walkthrough', 'Internal: sprint planning']],
  ] as const) {
    const r = same(await visible(s.meetings, scope.meetingScope(personas[who]), byTitle), [...expected]);
    check(`${who} sees meetings [${expected.join(', ')}]`, r.ok, r.detail);
  }

  console.log('\nPeople');
  const rohanPeople = await visible(s.users, scope.userScope(personas.rohan), byEmail);
  check('client A cannot see Client B users', !rohanPeople.has('ananya@zenith.example'));
  check('client A cannot see team not on their projects', !rohanPeople.has('kabir@ishatechnologies.in'));
  check('client A sees their project team', rohanPeople.has('aarav@ishatechnologies.in'));
  const kabirPeople = await visible(s.users, scope.userScope(personas.kabir), byEmail);
  check('employee sees client contacts on own project', kabirPeople.has('ananya@zenith.example'));
  check('employee cannot see other clients’ users', !kabirPeople.has('rohan@northwind.example'));

  console.log('\nActivity, leads, leave, change requests');
  const acts = await db.select().from(s.activities).where(scope.activityScope(personas.ananya));
  check('client B activity only from own account', acts.length > 0 && acts.every((a) => a.clientId === zenithId && a.visibility === 'client'));
  check('clients see no leads', (await db.select().from(s.leads).where(scope.leadScope(personas.rohan))).length === 0);
  const meeraLeads = await visible(s.leads, scope.leadScope(await viewerFor('meera@ishatechnologies.in')), byName);
  check('employee sees only leads assigned to them', same(meeraLeads, ['Vikram Joshi', 'Ishaan Gupta', 'Tara Nair']).ok);
  const kabirLeave = await db.select().from(s.leaveRequests).where(scope.leaveScope(personas.aarav));
  check('employee sees only own leave', kabirLeave.every((l) => l.userId === personas.aarav.id));
  check('client sees no leave requests', (await db.select().from(s.leaveRequests).where(scope.leaveScope(personas.rohan))).length === 0);

  console.log('\nDocuments');
  const docsA = await db.select().from(s.documents).where(scope.documentScope(personas.rohan));
  check('client A documents are Northwind + client-visible only', docsA.every((d) => d.clientId === northwindId && d.visibility === 'client'));
  const docsB = await db.select().from(s.documents).where(scope.documentScope(personas.ananya));
  check('client B documents are Zenith + client-visible only', docsB.every((d) => d.clientId === zenithId && d.visibility === 'client'));
  const docsKabir = await db.select().from(s.documents).where(scope.documentScope(personas.kabir));
  check('Zenith employee sees no Northwind documents', docsKabir.every((d) => d.clientId !== northwindId));
  const docName = (r: Record<string, unknown>) => String(r.name);
  for (const [who, expected] of [
    ['rohan', ['EKS target architecture.pdf']],
    ['ananya', ['CIS benchmark report.pdf']],
    ['aarav', ['EKS target architecture.pdf', 'Internal node-group cost model.csv']],
    ['kabir', ['CIS benchmark report.pdf', 'Zenith IAM findings (internal).pdf']],
  ] as const) {
    const r = same(await visible(s.documents, scope.documentScope(personas[who]), docName), [...expected]);
    check(`${who} sees exactly documents [${expected.join(', ')}]`, r.ok, r.detail);
  }

  console.log('\nChange requests');
  check('client A sees own change request', (await db.select().from(s.changeRequests).where(scope.changeRequestScope(personas.rohan))).length === 1);
  check('client B sees no Client A change request', (await db.select().from(s.changeRequests).where(scope.changeRequestScope(personas.ananya))).length === 0);
  check('employee without review permission sees none', (await db.select().from(s.changeRequests).where(scope.changeRequestScope(personas.aarav))).length === 0);

  console.log('\nGlobal search never crosses tenants');
  for (const term of ['Northwind', 'EKS', 'INV-2026', 'Zenith', 'Security', 'TKT', 'Kite']) {
    const a = await searchEverything(personas.rohan, term);
    const b = await searchEverything(personas.ananya, term);
    const aLeak = a.some((r) => /Zenith|Security Posture|INV-2026-000[45]|TKT-00003|Kite/.test(`${r.title} ${r.subtitle}`));
    const bLeak = b.some((r) => /Northwind|EKS|CI\/CD|INV-2026-000[1-3]|TKT-0000[12]|INV-2026-0005|Kite/.test(`${r.title} ${r.subtitle}`));
    check(`search "${term}": no cross-tenant results`, !aLeak && !bLeak, JSON.stringify({ a, b }).slice(0, 400));
  }

  console.log('\nRBAC');
  const { can } = await import('../src/server/auth/viewer');
  check('client holds no internal permission', !can(personas.rohan, 'clients.view') && !can(personas.rohan, 'invoices.view'));
  check('admin cannot view audit by default', !can(personas.admin, 'audit.view'));
  check('super admin can do everything', can(personas.superAdmin, 'audit.view') && can(personas.superAdmin, 'settings.manage'));
  check('employee cannot manage invoices', !can(personas.aarav, 'invoices.manage'));
  // A client-role user must never gain internal reach even if a bad grant is written.
  await db.insert(s.rolePermissions).values({ role: 'client', permission: 'clients.view' }).onConflictDoNothing();
  const rohanWithBadGrant = await viewerFor('rohan@northwind.example');
  const leak = await visible(s.clients, scope.clientScope(rohanWithBadGrant), byName);
  check('bad client grant is ignored (still only own account)', same(leak, ['Northwind Logistics']).ok);
  await db.delete(s.rolePermissions).where(and(eq(s.rolePermissions.role, 'client'), eq(s.rolePermissions.permission, 'clients.view')));

  // Deactivated users resolve to no viewer at all.
  const [nisha] = await db.select().from(s.users).where(eq(s.users.email, 'nisha@northwind.example'));
  check('deactivated user gets no viewer', (await buildViewer({ ...nisha, isActive: false }, 'x')) === null);
  await db.execute(sql`select 1`);

  console.log(`\n${passes} passed, ${failures} failed\n`);
  await closeDb();
  process.exit(failures ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
