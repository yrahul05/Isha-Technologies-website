/**
 * Seeds the portal.
 *
 *   npm run db:seed                 # Super Admin only (from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *   npm run db:seed -- --demo       # + a realistic two-client demo dataset (development only)
 *
 * The demo data deliberately contains two unrelated clients (Northwind,
 * Zenith) and an employee assigned to only one of them, so tenant
 * isolation can be verified by logging in as each (see scripts/verify-isolation.ts).
 */
import { eq, sql } from 'drizzle-orm';
import { closeDb, getDb } from '../src/server/db';
import * as s from '../src/server/db/schema';
import { hashPassword } from '../src/server/auth/password';
import { computeLine, computeTotals } from '../src/lib/portal/invoice-math';
import { syncRbac } from './lib/rbac';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { refuseOnRemoteDatabase } from './lib/remote-guard';

const DEMO_PASSWORD = 'Isha@Demo2026!';
const demo = process.argv.includes('--demo');
if (demo) refuseOnRemoteDatabase('seed demo data');

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const at = (offsetDays: number, hour: number, minute = 0) => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  // Hours are IST; store as UTC.
  d.setUTCHours(hour - 5, minute - 30, 0, 0);
  return d;
};

async function main() {
  const db = getDb();
  await syncRbac(db);

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@ishatechnologies.in').toLowerCase();
  let adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    if (process.env.NODE_ENV === 'production') throw new Error('Set SEED_ADMIN_PASSWORD to seed production.');
    adminPassword = DEMO_PASSWORD;
  }

  const [existingAdmin] = await db.select().from(s.users).where(eq(sql`lower(${s.users.email})`, adminEmail));
  let superAdminId = existingAdmin?.id;
  if (!existingAdmin) {
    const [row] = await db
      .insert(s.users)
      .values({
        email: adminEmail,
        username: 'superadmin',
        name: process.env.SEED_ADMIN_NAME || 'Super Admin',
        title: 'Founder & Principal Engineer',
        role: 'super_admin',
        passwordHash: await hashPassword(adminPassword),
      })
      .returning({ id: s.users.id });
    superAdminId = row.id;
    console.log(`✓ super admin created: ${adminEmail}`);
  } else {
    console.log(`• super admin exists: ${adminEmail}`);
  }

  if (!demo) {
    await closeDb();
    return;
  }
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== '1') {
    throw new Error('Refusing to seed demo data in production (set ALLOW_DEMO_SEED=1 to override).');
  }
  const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(s.clients)) as { n: number }[];
  if (n > 0) {
    console.log('• demo data already present — skipping');
    await closeDb();
    return;
  }

  const pw = await hashPassword(DEMO_PASSWORD);
  const mkUser = async (v: Omit<typeof s.users.$inferInsert, 'passwordHash'>) =>
    (await db.insert(s.users).values({ ...v, passwordHash: pw }).returning())[0];

  const admin = await mkUser({ email: 'ops@ishatechnologies.in', username: 'ops', name: 'Priya Sharma', title: 'Operations Lead', role: 'admin' });
  const aarav = await mkUser({ email: 'aarav@ishatechnologies.in', username: 'aarav', name: 'Aarav Mehta', title: 'Senior DevOps Engineer', role: 'employee' });
  const meera = await mkUser({ email: 'meera@ishatechnologies.in', username: 'meera', name: 'Meera Iyer', title: 'Cloud Architect', role: 'employee' });
  const kabir = await mkUser({ email: 'kabir@ishatechnologies.in', username: 'kabir', name: 'Kabir Singh', title: 'Site Reliability Engineer', role: 'employee' });
  await db.insert(s.employees).values([
    { userId: admin.id, department: 'Operations', designation: 'Operations Lead', joinedOn: day(-400) },
    { userId: aarav.id, department: 'Engineering', designation: 'Senior DevOps Engineer', joinedOn: day(-300), skills: ['AWS', 'Kubernetes', 'Terraform'] },
    { userId: meera.id, department: 'Engineering', designation: 'Cloud Architect', joinedOn: day(-250), skills: ['AWS', 'Azure', 'FinOps'] },
    { userId: kabir.id, department: 'Engineering', designation: 'SRE', joinedOn: day(-120), availability: 'busy', skills: ['Prometheus', 'Grafana', 'GCP'] },
  ]);
  if (superAdminId) await db.insert(s.employees).values({ userId: superAdminId, department: 'Leadership', designation: 'Founder' }).onConflictDoNothing();

  const [northwind] = await db
    .insert(s.clients)
    .values({
      code: 'CL-0001', companyName: 'Northwind Logistics', legalName: 'Northwind Logistics Pvt. Ltd.', contactName: 'Rohan Kapoor',
      email: 'rohan@northwind.example', phone: '+91 98290 11111', addressLine1: '4th Floor, Tower B, Cyber Park', city: 'Gurugram',
      state: 'Haryana', postalCode: '122002', gstin: '06AABCN1234F1Z5', industry: 'Logistics', website: 'northwind.example', accountManagerId: meera.id,
    })
    .returning();
  const [zenith] = await db
    .insert(s.clients)
    .values({
      code: 'CL-0002', companyName: 'Zenith Fintech', legalName: 'Zenith Fintech Solutions LLP', contactName: 'Ananya Rao',
      email: 'ananya@zenith.example', phone: '+91 99280 22222', addressLine1: 'MI Road', city: 'Jaipur', state: 'Rajasthan',
      postalCode: '302001', gstin: '08AAFFZ5678K1Z2', industry: 'Financial services', accountManagerId: kabir.id,
    })
    .returning();
  // International clients (no Indian GST): one in the US (USD), one in Canada (CAD).
  const [harbor, maple] = await db
    .insert(s.clients)
    .values([
      {
        code: 'CL-0003', companyName: 'Harbor Labs', legalName: 'Harbor Labs Inc.', contactName: 'Emily Carter', email: 'emily@harbor.example',
        addressLine1: '500 Market Street', city: 'San Francisco', state: 'California', postalCode: '94105', country: 'United States', industry: 'SaaS', accountManagerId: meera.id,
      },
      {
        code: 'CL-0004', companyName: 'Maple Analytics', legalName: 'Maple Analytics Ltd.', contactName: 'Liam Tremblay', email: 'liam@maple.example',
        addressLine1: '100 King Street West', city: 'Toronto', state: 'Ontario', postalCode: 'M5X 1A9', country: 'Canada', industry: 'Data & analytics', accountManagerId: kabir.id,
      },
    ])
    .returning();
  await db.insert(s.counters).values({ key: 'client', value: 4 }).onConflictDoNothing();

  const rohan = await mkUser({ email: 'rohan@northwind.example', username: 'rohan', name: 'Rohan Kapoor', title: 'VP Engineering', role: 'client' });
  const nisha = await mkUser({ email: 'nisha@northwind.example', username: 'nisha', name: 'Nisha Verma', title: 'Engineering Manager', role: 'client' });
  const ananya = await mkUser({ email: 'ananya@zenith.example', username: 'ananya', name: 'Ananya Rao', title: 'CTO', role: 'client' });
  await db.insert(s.clientUsers).values([
    { clientId: northwind.id, userId: rohan.id, role: 'owner' },
    { clientId: northwind.id, userId: nisha.id, role: 'member' },
    { clientId: zenith.id, userId: ananya.id, role: 'owner' },
  ]);
  const liam = await mkUser({ email: 'liam@maple.example', username: 'liam', name: 'Liam Tremblay', title: 'Head of Data Platform', role: 'client' });
  await db.insert(s.clientUsers).values({ clientId: maple.id, userId: liam.id, role: 'owner' });

  const [eks, cicd, zsec] = await db
    .insert(s.projects)
    .values([
      {
        code: 'PRJ-0001', name: 'EKS Platform Migration', clientId: northwind.id, status: 'active', priority: 'high', health: 'on_track',
        description: 'Migrate 14 services from EC2 Auto Scaling groups to Amazon EKS with GitOps (Argo CD), Karpenter and a hardened baseline.',
        startDate: day(-45), dueDate: day(40), budgetPaise: 1_250_000_00, technologies: ['AWS', 'EKS', 'Terraform', 'Argo CD', 'Karpenter'], createdBy: superAdminId,
      },
      {
        code: 'PRJ-0002', name: 'CI/CD Modernisation', clientId: northwind.id, status: 'at_risk', priority: 'medium', health: 'at_risk',
        description: 'Replace Jenkins with GitHub Actions + OIDC to AWS, reusable workflows and progressive delivery.',
        startDate: day(-20), dueDate: day(12), budgetPaise: 480_000_00, technologies: ['GitHub Actions', 'AWS', 'Docker'], createdBy: superAdminId,
      },
      {
        code: 'PRJ-0003', name: 'Cloud Security Posture Review', clientId: zenith.id, status: 'active', priority: 'urgent', health: 'on_track',
        description: 'CIS benchmark assessment, IAM least-privilege remediation and GuardDuty/Security Hub rollout ahead of RBI audit.',
        startDate: day(-10), dueDate: day(25), budgetPaise: 650_000_00, technologies: ['AWS', 'Security Hub', 'GuardDuty', 'IAM'], createdBy: superAdminId,
      },
    ])
    .returning();
  await db.insert(s.counters).values({ key: 'project', value: 3 }).onConflictDoNothing();

  await db.insert(s.projectMembers).values([
    { projectId: eks.id, userId: aarav.id, memberType: 'team', isLead: true },
    { projectId: eks.id, userId: meera.id, memberType: 'team' },
    { projectId: eks.id, userId: rohan.id, memberType: 'client' },
    { projectId: cicd.id, userId: aarav.id, memberType: 'team', isLead: true },
    { projectId: cicd.id, userId: nisha.id, memberType: 'client' },
    { projectId: zsec.id, userId: kabir.id, memberType: 'team', isLead: true },
    { projectId: zsec.id, userId: ananya.id, memberType: 'client' },
  ]);

  const taskRows: (typeof s.tasks.$inferInsert)[] = [
    { projectId: eks.id, title: 'Provision EKS cluster with Terraform', status: 'completed', priority: 'high', assigneeId: aarav.id, dueDate: day(-30), completedAt: new Date(Date.now() - 31 * 86_400_000), visibility: 'client' },
    { projectId: eks.id, title: 'Set up Argo CD app-of-apps', status: 'completed', priority: 'high', assigneeId: aarav.id, dueDate: day(-18), completedAt: new Date(Date.now() - 19 * 86_400_000), visibility: 'client' },
    { projectId: eks.id, title: 'Migrate order-service to EKS', status: 'in_progress', priority: 'high', assigneeId: meera.id, dueDate: day(3), visibility: 'client' },
    { projectId: eks.id, title: 'Karpenter node pools & consolidation', status: 'review', priority: 'medium', assigneeId: aarav.id, dueDate: day(1) },
    { projectId: eks.id, title: 'Share production cutover window', status: 'todo', priority: 'medium', assigneeId: meera.id, dueDate: day(9), visibility: 'client', description: 'Client to confirm a low-traffic window for the final DNS cutover.' },
    { projectId: eks.id, title: 'Internal: cost model for node groups', status: 'todo', priority: 'low', assigneeId: meera.id, dueDate: day(14) },
    { projectId: cicd.id, title: 'GitHub OIDC trust to AWS accounts', status: 'completed', priority: 'high', assigneeId: aarav.id, dueDate: day(-8), completedAt: new Date(Date.now() - 9 * 86_400_000), visibility: 'client' },
    { projectId: cicd.id, title: 'Reusable deploy workflow', status: 'blocked', priority: 'high', assigneeId: aarav.id, dueDate: day(-2), visibility: 'client', description: 'Blocked on access to the legacy artifact registry.' },
    { projectId: cicd.id, title: 'Decommission Jenkins controllers', status: 'todo', priority: 'medium', assigneeId: aarav.id, dueDate: day(11) },
    { projectId: zsec.id, title: 'Run CIS AWS Foundations benchmark', status: 'completed', priority: 'urgent', assigneeId: kabir.id, dueDate: day(-3), completedAt: new Date(Date.now() - 4 * 86_400_000), visibility: 'client' },
    { projectId: zsec.id, title: 'IAM least-privilege remediation', status: 'in_progress', priority: 'urgent', assigneeId: kabir.id, dueDate: day(6), visibility: 'client' },
    { projectId: zsec.id, title: 'Enable Security Hub org-wide', status: 'todo', priority: 'high', assigneeId: kabir.id, dueDate: day(10) },
  ];
  const insertedTasks = await db.insert(s.tasks).values(taskRows.map((t, i) => ({ ...t, reporterId: superAdminId, position: i }))).returning();
  const orderTask = insertedTasks[2];
  await db.insert(s.taskChecklistItems).values([
    { taskId: orderTask.id, label: 'Containerise with distroless base image', isDone: true, position: 0 },
    { taskId: orderTask.id, label: 'Helm chart + values per environment', isDone: true, position: 1 },
    { taskId: orderTask.id, label: 'Load test on staging', isDone: false, position: 2 },
    { taskId: orderTask.id, label: 'Canary release plan', isDone: false, position: 3 },
  ]);
  await db.insert(s.taskComments).values([
    { taskId: orderTask.id, authorId: meera.id, body: 'Staging deploy is green. Starting load tests tomorrow.', isInternal: false },
    { taskId: orderTask.id, authorId: aarav.id, body: 'Internal: watch the HPA — p95 latency spiked at 400 rps.', isInternal: true },
    { taskId: orderTask.id, authorId: rohan.id, body: 'Great progress — please share the load test report when ready.', isInternal: false },
  ]);

  // Invoices — Northwind has a lifetime history, Zenith one open invoice.
  const sac = '998313';
  const mkInvoice = async (
    number: string,
    client: typeof northwind,
    projectId: string | null,
    issue: number,
    dueIn: number,
    lines: { description: string; quantity: number; rupees: number; taxRatePct?: number; discountPct?: number }[],
    status: 'draft' | 'sent' | 'cancelled',
    paid: { rupees: number; on: number; method: 'bank_transfer' | 'upi'; reference: string }[],
    opts: { currency?: 'INR' | 'USD' | 'CAD'; taxMode?: string; taxLabel?: string } = {}
  ) => {
    // Amounts are given in major units (₹ / $) and stored in minor units.
    const currency = opts.currency ?? 'INR';
    const gst = currency === 'INR' && (opts.taxMode ?? 'gst_auto').startsWith('gst');
    const items = lines.map((l, i) => ({
      description: l.description, hsnSac: gst ? sac : null, quantity: l.quantity, unitPricePaise: l.rupees * 100,
      discountPct: l.discountPct ?? 0, taxRatePct: l.taxRatePct ?? (gst ? 18 : 0), position: i,
    }));
    const totals = computeTotals(items);
    const paidPaise = paid.reduce((sum, p) => sum + p.rupees * 100, 0);
    const [inv] = await db
      .insert(s.invoices)
      .values({
        number, clientId: client.id, projectId, status, issueDate: day(issue), dueDate: day(issue + dueIn),
        billingName: client.legalName ?? client.companyName,
        billingAddress: [client.addressLine1, `${client.city}, ${client.state} ${client.postalCode}`, client.country].filter(Boolean).join('\n'),
        billingGstin: gst ? client.gstin : null, placeOfSupply: gst ? client.gstin?.slice(0, 2) : null,
        currency, taxMode: opts.taxMode ?? (gst ? 'gst_auto' : 'none'), taxLabel: opts.taxLabel ?? null, paymentProfile: currency === 'INR' ? 'domestic' : 'international',
        ...totals, paidPaise,
        terms: currency === 'INR' ? 'Payment due within 15 days of the invoice date.' : 'Payment due within 15 days by international wire transfer. Bank charges are borne by the remitter.',
        notes: 'Thank you for your business.',
        sentAt: status === 'draft' ? null : new Date(Date.now() + issue * 86_400_000), createdBy: superAdminId,
      })
      .returning();
    await db.insert(s.invoiceItems).values(items.map((it) => ({ ...it, invoiceId: inv.id, amountPaise: computeLine(it).taxablePaise })));
    for (const p of paid) {
      await db.insert(s.payments).values({ invoiceId: inv.id, clientId: client.id, amountPaise: p.rupees * 100, paidOn: day(p.on), method: p.method, reference: p.reference, recordedBy: superAdminId });
    }
    return inv;
  };

  // Issued invoices use the server-side sequence ISH-<year>-<nnnn>; drafts have no number yet.
  await mkInvoice('ISH-2026-0001', northwind, eks.id, -170, 15, [{ description: 'AWS Well-Architected review & migration plan', quantity: 1, rupees: 120000 }], 'sent', [{ rupees: 141600, on: -160, method: 'bank_transfer', reference: 'UTR 4481920011' }]);
  await mkInvoice('ISH-2026-0002', northwind, eks.id, -60, 15, [
    { description: 'EKS platform engineering — Phase 1 (fixed fee)', quantity: 1, rupees: 350000 },
    { description: 'Terraform module library', quantity: 1, rupees: 90000, discountPct: 10 },
  ], 'sent', [{ rupees: 250000, on: -40, method: 'bank_transfer', reference: 'UTR 5520019932' }]);
  await mkInvoice('ISH-2026-0003', northwind, cicd.id, -5, 15, [{ description: 'CI/CD modernisation — milestone 1', quantity: 40, rupees: 3500 }], 'sent', []);
  await mkInvoice('ISH-2026-0004', zenith, zsec.id, -25, 15, [
    { description: 'Cloud security posture assessment', quantity: 1, rupees: 42373 },
  ], 'sent', [{ rupees: 30000, on: -12, method: 'upi', reference: 'zenith@hdfcbank' }]);
  await mkInvoice('ISH-2026-0005', harbor, null, -20, 15, [{ description: 'Kubernetes platform assessment (remote)', quantity: 1, rupees: 4800 }, { description: 'SRE advisory hours', quantity: 10, rupees: 120 }], 'sent', [], { currency: 'USD' });
  await mkInvoice('ISH-2026-0006', maple, null, -3, 15, [{ description: 'Data platform reliability review', quantity: 1, rupees: 6500, taxRatePct: 13 }], 'sent', [], { currency: 'CAD', taxMode: 'custom', taxLabel: 'HST' });
  await mkInvoice('DRAFT-5EED0001', zenith, zsec.id, 0, 15, [{ description: 'IAM remediation sprint', quantity: 1, rupees: 180000 }], 'draft', []);
  await db.insert(s.counters).values({ key: 'invoice:ISH:2026', value: 6 }).onConflictDoNothing();

  await db.insert(s.tickets).values([
    { number: 'TKT-00001', clientId: northwind.id, projectId: eks.id, subject: 'Staging ingress returns 502 intermittently', description: 'Since yesterday evening roughly 1 in 20 requests to staging returns 502.', priority: 'high', category: 'incident', status: 'in_progress', createdBy: rohan.id, assigneeId: aarav.id },
    { number: 'TKT-00002', clientId: northwind.id, projectId: cicd.id, subject: 'Need access to deployment dashboard for QA team', description: 'Please add 3 QA engineers to the deployment dashboard.', priority: 'low', category: 'access', status: 'waiting_for_client', createdBy: nisha.id, assigneeId: aarav.id },
    { number: 'TKT-00003', clientId: zenith.id, projectId: zsec.id, subject: 'Clarify scope of RBI audit evidence', description: 'Which reports will be included in the evidence pack?', priority: 'medium', category: 'question', status: 'open', createdBy: ananya.id, assigneeId: kabir.id },
  ]);
  await db.insert(s.counters).values({ key: 'ticket', value: 3 }).onConflictDoNothing();

  const [m1] = await db.insert(s.meetings).values([
    { title: 'EKS migration weekly sync', clientId: northwind.id, projectId: eks.id, organizerId: meera.id, startsAt: at(1, 11), durationMinutes: 45, agenda: '1. Cutover plan\n2. Load test results\n3. Risks', meetingLink: 'https://meet.google.com/demo-link-one', provider: 'manual' },
    { title: 'Security findings walkthrough', clientId: zenith.id, projectId: zsec.id, organizerId: kabir.id, startsAt: at(2, 15, 30), durationMinutes: 60, agenda: 'CIS results and remediation priorities', meetingLink: 'https://meet.google.com/demo-link-two', provider: 'manual' },
    { title: 'Internal: sprint planning', organizerId: admin.id, startsAt: at(0, 17), durationMinutes: 30 },
  ]).returning();
  const meetingsAll = await db.select().from(s.meetings);
  const byTitle = (t: string) => meetingsAll.find((m) => m.title === t)!.id;
  await db.insert(s.meetingAttendees).values([
    { meetingId: m1.id, userId: meera.id }, { meetingId: m1.id, userId: aarav.id }, { meetingId: m1.id, userId: rohan.id },
    { meetingId: byTitle('Security findings walkthrough'), userId: kabir.id }, { meetingId: byTitle('Security findings walkthrough'), userId: ananya.id },
    { meetingId: byTitle('Internal: sprint planning'), userId: admin.id }, { meetingId: byTitle('Internal: sprint planning'), userId: aarav.id },
    { meetingId: byTitle('Internal: sprint planning'), userId: meera.id }, { meetingId: byTitle('Internal: sprint planning'), userId: kabir.id },
  ]);

  // A pending client work request (Northwind) and a pending meeting request (Zenith).
  const [workRequest] = await db
    .insert(s.taskRequests)
    .values({ clientId: northwind.id, projectId: eks.id, requestedBy: nisha.id, title: 'Add a staging cluster for the payments service', description: 'We need an isolated staging environment for payments before the November release, mirroring production network policies.', priority: 'high', desiredDueDate: day(21) })
    .returning();
  await db.insert(s.taskRequestComments).values({ requestId: workRequest.id, authorId: nisha.id, body: 'Happy to share the current Helm values if useful.' });
  const [meetingRequest] = await db
    .insert(s.meetings)
    .values({ title: 'RBI audit evidence review', clientId: zenith.id, projectId: zsec.id, startsAt: at(4, 12), durationMinutes: 45, agenda: 'Walk through the evidence pack structure.', status: 'requested', requestedBy: ananya.id })
    .returning();
  await db.insert(s.meetingAttendees).values([{ meetingId: meetingRequest.id, userId: ananya.id }, { meetingId: meetingRequest.id, userId: kabir.id }]);

  await db.insert(s.calendarEvents).values([
    { title: 'Diwali', type: 'holiday', startsOn: '2026-11-08', endsOn: '2026-11-09', audience: 'all', createdBy: superAdminId },
    { title: 'Quarterly all-hands', type: 'event', startsOn: day(7), endsOn: day(7), audience: 'employees', createdBy: superAdminId },
  ]);

  await db.insert(s.leads).values([
    { name: 'Vikram Joshi', company: 'Kite Retail', email: 'vikram@kite.example', phone: '+91 90000 33333', source: 'website_assessment', serviceInterested: 'Cloud Cost Optimization & FinOps', status: 'qualified', estimatedValuePaise: 900_000_00, assignedTo: meera.id, followUpAt: at(1, 10), attribution: { utm_source: 'linkedin', utm_medium: 'social', utm_campaign: 'finops-q3' }, assessment: { currentCloud: 'AWS', infrastructure: ['EC2', 'RDS'], monthlySpend: '₹5L – ₹20L', deploymentFrequency: 'Weekly', problems: 'Spend grew 40% in two quarters.', companySize: '51–200' } },
    { name: 'Sara Thomas', company: 'MedAxis Health', email: 'sara@medaxis.example', source: 'contact_form', serviceInterested: 'DevSecOps', status: 'new', estimatedValuePaise: 400_000_00, assignedTo: admin.id, followUpAt: at(0, 16) },
    { name: 'Dev Patel', company: 'Orbit Games', email: 'dev@orbit.example', source: 'referral', serviceInterested: 'Kubernetes & Container Platforms', status: 'proposal_sent', estimatedValuePaise: 1_500_000_00, assignedTo: admin.id, followUpAt: at(3, 12) },
    { name: 'Ishaan Gupta', company: 'Ledgerly', email: 'ishaan@ledgerly.example', source: 'linkedin', status: 'won', estimatedValuePaise: 700_000_00, assignedTo: meera.id },
    { name: 'Tara Nair', company: 'Bloom Edu', email: 'tara@bloom.example', source: 'website_assessment', status: 'lost', estimatedValuePaise: 200_000_00, assignedTo: meera.id },
  ]);

  await db.insert(s.leaveRequests).values([
    { userId: kabir.id, type: 'casual', startDate: day(5), endDate: day(6), reason: 'Family function', status: 'pending' },
    { userId: aarav.id, type: 'sick', startDate: day(-12), endDate: day(-11), reason: 'Fever', status: 'approved', reviewedBy: admin.id, reviewedAt: new Date() },
  ]);

  // Sales & delivery business data: proposals, contracts, renewals and timesheets.
  const [prpSent, prpDraft, prpZenith] = await db
    .insert(s.proposals)
    .values([
      { number: 'PRP-2026-0001', title: 'Observability rollout — phase 2', clientId: northwind.id, status: 'sent', currency: 'INR', summary: 'Extend Prometheus/Grafana coverage to all services.', validUntil: day(14), subtotalPaise: 300_000_00, discountPaise: 0, taxPaise: 54_000_00, totalPaise: 354_000_00, sentAt: new Date(), ownerId: meera.id, createdBy: meera.id },
      { number: 'DRAFT-PRP-NW', title: 'Internal draft: FinOps retainer', clientId: northwind.id, status: 'draft', currency: 'INR', subtotalPaise: 120_000_00, discountPaise: 0, taxPaise: 21_600_00, totalPaise: 141_600_00, ownerId: meera.id, createdBy: meera.id },
      { number: 'PRP-2026-0002', title: 'PCI-DSS readiness assessment', clientId: zenith.id, status: 'sent', currency: 'INR', summary: 'Gap assessment against PCI-DSS 4.0.', validUntil: day(10), subtotalPaise: 250_000_00, discountPaise: 0, taxPaise: 45_000_00, totalPaise: 295_000_00, sentAt: new Date(), ownerId: kabir.id, createdBy: kabir.id },
    ])
    .returning();
  await db.insert(s.proposalItems).values([
    { proposalId: prpSent.id, description: 'Dashboards & alert rules', quantity: 1, unitPricePaise: 300_000_00, discountPct: 0, taxRatePct: 18, amountPaise: 300_000_00, position: 0 },
    { proposalId: prpDraft.id, description: 'Monthly FinOps review', quantity: 6, unitPricePaise: 20_000_00, discountPct: 0, taxRatePct: 18, amountPaise: 120_000_00, position: 0 },
    { proposalId: prpZenith.id, description: 'PCI-DSS gap assessment', quantity: 1, unitPricePaise: 250_000_00, discountPct: 0, taxRatePct: 18, amountPaise: 250_000_00, position: 0 },
  ]);
  await db.insert(s.contracts).values([
    { number: 'CTR-2026-0001', title: 'Northwind managed cloud SOW', kind: 'sow', clientId: northwind.id, projectId: eks.id, status: 'active', currency: 'INR', valuePaise: 1_200_000_00, startDate: day(-90), endDate: day(25), autoRenew: false, renewalNoticeDays: 30, createdBy: meera.id },
    { number: 'DRAFT-CTR-NW', title: 'Northwind NDA (draft)', kind: 'nda', clientId: northwind.id, status: 'draft', currency: 'INR', createdBy: meera.id },
    { number: 'CTR-2026-0002', title: 'Zenith security MSA', kind: 'msa', clientId: zenith.id, projectId: zsec.id, status: 'active', currency: 'INR', valuePaise: 800_000_00, startDate: day(-60), endDate: day(300), autoRenew: true, renewalNoticeDays: 45, createdBy: kabir.id },
  ]);
  await db.insert(s.renewalItems).values([
    { clientId: northwind.id, kind: 'domain', name: 'northwind.example', vendor: 'GoDaddy', expiresOn: day(12), costPaise: 1_500_00, ownerId: aarav.id },
    { clientId: zenith.id, kind: 'ssl', name: 'api.zenith.example certificate', vendor: 'DigiCert', expiresOn: day(40), costPaise: 9_000_00, ownerId: kabir.id },
    { clientId: null, kind: 'license', name: 'Internal monitoring licence', vendor: 'Grafana Labs', expiresOn: day(90), costPaise: 60_000_00, ownerId: admin.id },
  ]);
  await db.insert(s.timeEntries).values([
    { userId: aarav.id, projectId: eks.id, workDate: day(-1), minutes: 240, billable: true, note: 'Argo CD app-of-apps' },
    { userId: aarav.id, projectId: eks.id, workDate: day(-2), minutes: 180, billable: true, note: 'Karpenter node pools' },
    { userId: kabir.id, projectId: zsec.id, workDate: day(-1), minutes: 300, billable: true, note: 'CIS benchmark run' },
    { userId: meera.id, projectId: eks.id, workDate: day(-3), minutes: 120, billable: false, note: 'Architecture review (internal)' },
  ]);

  const activity = (entityType: string, entityId: string, summary: string, extra: Partial<typeof s.activities.$inferInsert>) => ({ entityType, entityId, summary, ...extra });
  await db.insert(s.activities).values([
    activity('project', eks.id, 'Project EKS Platform Migration created', { clientId: northwind.id, projectId: eks.id, actorId: superAdminId, visibility: 'client' }),
    activity('task', insertedTasks[1].id, 'Completed “Set up Argo CD app-of-apps”', { clientId: northwind.id, projectId: eks.id, actorId: aarav.id, visibility: 'client' }),
    activity('task', insertedTasks[7].id, 'Marked “Reusable deploy workflow” as blocked', { clientId: northwind.id, projectId: cicd.id, actorId: aarav.id, visibility: 'client' }),
    activity('project', zsec.id, 'Project Cloud Security Posture Review created', { clientId: zenith.id, projectId: zsec.id, actorId: superAdminId, visibility: 'client' }),
    activity('task', insertedTasks[9].id, 'Completed “Run CIS AWS Foundations benchmark”', { clientId: zenith.id, projectId: zsec.id, actorId: kabir.id, visibility: 'client' }),
  ]);

  const note = (userId: string, title: string, body: string, type: string, link: string, priority: 'normal' | 'high' = 'normal') => ({ userId, title, body, type, link, priority });
  await db.insert(s.notifications).values([
    note(aarav.id, 'New task assigned', 'Karpenter node pools & consolidation', 'task.assigned', `/portal/tasks/${insertedTasks[3].id}`, 'high'),
    note(rohan.id, 'Invoice ISH-2026-0003 issued', 'CI/CD modernisation — milestone 1', 'invoice.created', '/portal/invoices'),
    note(ananya.id, 'Meeting scheduled', 'Security findings walkthrough', 'meeting.scheduled', '/portal/meetings'),
    note(superAdminId!, 'New assessment lead', 'Vikram Joshi · Kite Retail', 'lead.created', '/portal/leads', 'high'),
  ]);

  // Documents (local dev storage) — client-visible and internal files for both tenants.
  const uploadRoot = path.resolve(process.env.LOCAL_UPLOAD_DIR || '.data/uploads');
  const mkPdf = async (title: string) => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    page.drawText(title, { x: 50, y: 780, size: 20, font: await pdf.embedFont(StandardFonts.HelveticaBold) });
    page.drawText('Demo document generated by the portal seed script.', { x: 50, y: 750, size: 11, font: await pdf.embedFont(StandardFonts.Helvetica) });
    return Buffer.from(await pdf.save());
  };
  const docSeed = [
    { name: 'EKS target architecture.pdf', client: northwind, project: eks, visibility: 'client' as const, category: 'architecture', by: meera, bytes: await mkPdf('EKS target architecture') },
    { name: 'Internal node-group cost model.csv', client: northwind, project: eks, visibility: 'internal' as const, category: 'report', by: meera, bytes: Buffer.from('node_group,instance,monthly_inr\ngeneral,m6i.large,48000\n') },
    { name: 'CIS benchmark report.pdf', client: zenith, project: zsec, visibility: 'client' as const, category: 'report', by: kabir, bytes: await mkPdf('CIS AWS Foundations benchmark report') },
    { name: 'Zenith IAM findings (internal).pdf', client: zenith, project: zsec, visibility: 'internal' as const, category: 'report', by: kabir, bytes: await mkPdf('IAM findings — internal') },
  ];
  for (const d of docSeed) {
    const key = `${d.client.id}/${randomUUID()}/${d.name.replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-')}`;
    await mkdir(path.dirname(path.join(uploadRoot, key)), { recursive: true });
    await writeFile(path.join(uploadRoot, key), d.bytes);
    const [doc] = await db.insert(s.documents).values({ name: d.name, category: d.category, clientId: d.client.id, projectId: d.project.id, visibility: d.visibility, uploadedBy: d.by.id }).returning();
    await db.insert(s.documentVersions).values({ documentId: doc.id, version: 1, storageKey: key, fileName: d.name, mimeType: d.name.endsWith('.pdf') ? 'application/pdf' : 'text/csv', sizeBytes: d.bytes.length, uploadedBy: d.by.id });
  }

  await db.insert(s.changeRequests).values({ clientId: northwind.id, requestedBy: rohan.id, entityType: 'client', entityId: northwind.id, field: 'addressLine1', oldValue: northwind.addressLine1, newValue: '7th Floor, Tower C, Cyber Park', reason: 'Our office moved floors in September.' });

  console.log('✓ demo data seeded');
  console.log(`\n  All demo accounts use the password: ${DEMO_PASSWORD}`);
  console.log('  super admin  ', adminEmail);
  console.log('  admin        ops@ishatechnologies.in');
  console.log('  employee     aarav@ / meera@ (Northwind) · kabir@ (Zenith)  …@ishatechnologies.in');
  console.log('  client A     rohan@northwind.example (owner) · nisha@northwind.example');
  console.log('  client B     ananya@zenith.example\n');
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
