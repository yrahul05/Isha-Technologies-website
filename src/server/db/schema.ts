/**
 * Relational schema for the Isha Technologies portal.
 *
 * Conventions
 * - Primary keys are random UUIDs (never sequential) so record ids in URLs
 *   can't be enumerated. Human-facing numbers (INV-2026-0001, TKT-00012)
 *   come from the `counters` table.
 * - Money is stored as integer **paise** (`*_paise`, bigint) — no floating
 *   point anywhere in financial math.
 * - Every row that belongs to a customer carries `client_id` (directly, or
 *   via its project), and every such column is indexed: tenant scoping in
 *   src/server/scope.ts is a plain indexed WHERE clause.
 * - Soft delete (`deleted_at`) only where history must survive (documents,
 *   clients are deactivated rather than deleted).
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const money = (name: string) => bigint(name, { mode: 'number' }).notNull().default(0);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const roleKey = pgEnum('role_key', ['super_admin', 'admin', 'employee', 'client']);
export const clientStatus = pgEnum('client_status', ['active', 'inactive', 'onboarding']);
export const clientUserRole = pgEnum('client_user_role', ['owner', 'member']);
export const projectStatus = pgEnum('project_status', [
  'planning',
  'active',
  'on_hold',
  'at_risk',
  'completed',
  'cancelled',
]);
export const priority = pgEnum('priority', ['low', 'medium', 'high', 'urgent']);
export const projectHealth = pgEnum('project_health', ['on_track', 'at_risk', 'off_track']);
export const memberType = pgEnum('member_type', ['team', 'client']);
export const taskStatus = pgEnum('task_status', ['todo', 'in_progress', 'review', 'completed', 'blocked']);
export const visibility = pgEnum('visibility', ['internal', 'client']);
export const invoiceStatus = pgEnum('invoice_status', [
  'draft',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
]);
export const paymentMethod = pgEnum('payment_method', [
  'bank_transfer',
  'upi',
  'card',
  'cheque',
  'cash',
  'other',
]);
export const ticketStatus = pgEnum('ticket_status', [
  'open',
  'in_progress',
  'waiting_for_client',
  'resolved',
  'closed',
]);
export const meetingStatus = pgEnum('meeting_status', ['scheduled', 'cancelled', 'completed']);
export const meetingProvider = pgEnum('meeting_provider', ['google_meet', 'manual']);
export const notificationPriority = pgEnum('notification_priority', ['low', 'normal', 'high', 'urgent']);
export const calendarEventType = pgEnum('calendar_event_type', ['holiday', 'event', 'deadline']);
export const audienceType = pgEnum('audience_type', ['all', 'employees', 'clients']);
export const leadStatus = pgEnum('lead_status', [
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'negotiation',
  'won',
  'lost',
]);
export const leadSource = pgEnum('lead_source', [
  'website_assessment',
  'contact_form',
  'referral',
  'linkedin',
  'manual',
  'other',
]);
export const leaveType = pgEnum('leave_type', ['casual', 'sick', 'earned', 'unpaid', 'other']);
export const reviewStatus = pgEnum('review_status', ['pending', 'approved', 'rejected', 'cancelled']);
export const announcementKind = pgEnum('announcement_kind', [
  'leave',
  'holiday',
  'office',
  'maintenance',
  'emergency',
  'general',
]);
export const authTokenType = pgEnum('auth_token_type', ['password_reset', 'invite']);
export const availability = pgEnum('availability', ['available', 'busy', 'on_leave']);

// ---------------------------------------------------------------------------
// Identity, RBAC, sessions
// ---------------------------------------------------------------------------
export const roles = pgTable('roles', {
  key: roleKey('key').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
});

export const permissions = pgTable('permissions', {
  key: text('key').primaryKey(),
  label: text('label').notNull(),
  group: text('group').notNull(),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    role: roleKey('role')
      .notNull()
      .references(() => roles.key, { onDelete: 'cascade' }),
    permission: text('permission')
      .notNull()
      .references(() => permissions.key, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.role, t.permission] })]
);

export const users = pgTable(
  'users',
  {
    id: id(),
    email: text('email').notNull(),
    username: text('username'),
    name: text('name').notNull(),
    phone: text('phone'),
    title: text('title'),
    role: roleKey('role')
      .notNull()
      .references(() => roles.key),
    /** Null until the invite is accepted and a password is chosen. */
    passwordHash: text('password_hash'),
    isActive: boolean('is_active').notNull().default(true),
    /** TOTP secret, AES-256-GCM encrypted with ENCRYPTION_KEY. */
    totpSecretEnc: text('totp_secret_enc'),
    totpEnabled: boolean('totp_enabled').notNull().default(false),
    emailNotifications: boolean('email_notifications').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('users_email_uq').on(sql`lower(${t.email})`),
    uniqueIndex('users_username_uq').on(sql`lower(${t.username})`),
    index('users_role_idx').on(t.role),
  ]
);

export const employees = pgTable('employees', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  department: text('department'),
  designation: text('designation'),
  joinedOn: date('joined_on'),
  weeklyCapacityHours: integer('weekly_capacity_hours').notNull().default(40),
  availability: availability('availability').notNull().default('available'),
  skills: text('skills').array().notNull().default(sql`'{}'::text[]`),
});

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 of the cookie token — the raw token is never stored. */
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    /** False while a TOTP-enabled user still has to enter their code. */
    mfaVerified: boolean('mfa_verified').notNull().default(true),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)]
);

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: authTokenType('type').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('auth_tokens_hash_uq').on(t.tokenHash), index('auth_tokens_user_idx').on(t.userId)]
);

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    ip: text('ip').notNull(),
    success: boolean('success').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('login_attempts_identifier_idx').on(t.identifier, t.createdAt),
    index('login_attempts_ip_idx').on(t.ip, t.createdAt),
  ]
);

export const googleAccounts = pgTable('google_accounts', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  googleEmail: text('google_email').notNull(),
  refreshTokenEnc: text('refresh_token_enc').notNull(),
  accessTokenEnc: text('access_token_enc'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  scope: text('scope').notNull(),
  connectedAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
export const clients = pgTable(
  'clients',
  {
    id: id(),
    code: text('code').notNull(),
    companyName: text('company_name').notNull(),
    legalName: text('legal_name'),
    contactName: text('contact_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    city: text('city'),
    state: text('state'),
    postalCode: text('postal_code'),
    country: text('country').notNull().default('India'),
    gstin: text('gstin'),
    pan: text('pan'),
    industry: text('industry'),
    website: text('website'),
    status: clientStatus('status').notNull().default('active'),
    accountManagerId: uuid('account_manager_id').references(() => users.id, { onDelete: 'set null' }),
    leadId: uuid('lead_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('clients_code_uq').on(t.code), index('clients_status_idx').on(t.status)]
);

/** A client-role user belongs to exactly one client account. */
export const clientUsers = pgTable(
  'client_users',
  {
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: clientUserRole('role').notNull().default('member'),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.clientId, t.userId] }),
    uniqueIndex('client_users_user_uq').on(t.userId),
  ]
);

export const clientNotes = pgTable(
  'client_notes',
  {
    id: id(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('client_notes_client_idx').on(t.clientId)]
);

// ---------------------------------------------------------------------------
// Projects & tasks
// ---------------------------------------------------------------------------
export const projects = pgTable(
  'projects',
  {
    id: id(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    description: text('description').notNull().default(''),
    status: projectStatus('status').notNull().default('planning'),
    priority: priority('priority').notNull().default('medium'),
    health: projectHealth('health').notNull().default('on_track'),
    startDate: date('start_date'),
    dueDate: date('due_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    budgetPaise: money('budget_paise'),
    technologies: text('technologies').array().notNull().default(sql`'{}'::text[]`),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('projects_code_uq').on(t.code),
    index('projects_client_idx').on(t.clientId),
    index('projects_status_idx').on(t.status),
  ]
);

export const projectMembers = pgTable(
  'project_members',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    memberType: memberType('member_type').notNull(),
    isLead: boolean('is_lead').notNull().default(false),
    addedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] }), index('project_members_user_idx').on(t.userId)]
);

export const tasks = pgTable(
  'tasks',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: taskStatus('status').notNull().default('todo'),
    priority: priority('priority').notNull().default('medium'),
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
    dueDate: date('due_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /** `client` tasks are visible to the project's client users. */
    visibility: visibility('visibility').notNull().default('internal'),
    position: integer('position').notNull().default(0),
    estimateHours: numeric('estimate_hours', { precision: 6, scale: 1, mode: 'number' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('tasks_project_idx').on(t.projectId),
    index('tasks_assignee_idx').on(t.assigneeId),
    index('tasks_due_idx').on(t.dueDate),
    index('tasks_status_idx').on(t.status),
  ]
);

export const taskChecklistItems = pgTable(
  'task_checklist_items',
  {
    id: id(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    isDone: boolean('is_done').notNull().default(false),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('task_checklist_task_idx').on(t.taskId)]
);

export const taskComments = pgTable(
  'task_comments',
  {
    id: id(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    /** Internal comments are never shown to client users. */
    isInternal: boolean('is_internal').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index('task_comments_task_idx').on(t.taskId)]
);

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export const documents = pgTable(
  'documents',
  {
    id: id(),
    name: text('name').notNull(),
    category: text('category').notNull().default('general'),
    /** Denormalised from the project when set, so client scoping is one indexed column. */
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    ticketId: uuid('ticket_id'),
    visibility: visibility('visibility').notNull().default('internal'),
    currentVersion: integer('current_version').notNull().default(1),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('documents_client_idx').on(t.clientId),
    index('documents_project_idx').on(t.projectId),
    index('documents_task_idx').on(t.taskId),
    index('documents_ticket_idx').on(t.ticketId),
  ]
);

export const documentVersions = pgTable(
  'document_versions',
  {
    id: id(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    storageKey: text('storage_key').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    checksumSha256: text('checksum_sha256'),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('document_versions_doc_version_uq').on(t.documentId, t.version)]
);

/** Short-lived record of an authorised, not-yet-finalised upload. */
export const pendingUploads = pgTable('pending_uploads', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  /** JSON of the validated target (documentId / clientId / projectId / …). */
  target: jsonb('target').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Invoices & payments
// ---------------------------------------------------------------------------
export const invoices = pgTable(
  'invoices',
  {
    id: id(),
    number: text('number').notNull(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    status: invoiceStatus('status').notNull().default('draft'),
    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date').notNull(),
    currency: text('currency').notNull().default('INR'),
    billingName: text('billing_name').notNull(),
    billingAddress: text('billing_address').notNull().default(''),
    billingGstin: text('billing_gstin'),
    placeOfSupply: text('place_of_supply'),
    subtotalPaise: money('subtotal_paise'),
    discountPaise: money('discount_paise'),
    taxPaise: money('tax_paise'),
    totalPaise: money('total_paise'),
    paidPaise: money('paid_paise'),
    notes: text('notes').notNull().default(''),
    terms: text('terms').notNull().default(''),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('invoices_number_uq').on(t.number),
    index('invoices_client_idx').on(t.clientId),
    index('invoices_status_idx').on(t.status),
    index('invoices_due_idx').on(t.dueDate),
  ]
);

export const invoiceItems = pgTable(
  'invoice_items',
  {
    id: id(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    hsnSac: text('hsn_sac'),
    quantity: numeric('quantity', { precision: 12, scale: 2, mode: 'number' }).notNull(),
    unitPricePaise: money('unit_price_paise'),
    discountPct: numeric('discount_pct', { precision: 5, scale: 2, mode: 'number' }).notNull().default(0),
    taxRatePct: numeric('tax_rate_pct', { precision: 5, scale: 2, mode: 'number' }).notNull().default(18),
    amountPaise: money('amount_paise'),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('invoice_items_invoice_idx').on(t.invoiceId)]
);

export const payments = pgTable(
  'payments',
  {
    id: id(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    amountPaise: money('amount_paise'),
    paidOn: date('paid_on').notNull(),
    method: paymentMethod('method').notNull(),
    reference: text('reference'),
    notes: text('notes'),
    recordedBy: uuid('recorded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('payments_invoice_idx').on(t.invoiceId), index('payments_client_idx').on(t.clientId)]
);

// ---------------------------------------------------------------------------
// Support tickets
// ---------------------------------------------------------------------------
export const tickets = pgTable(
  'tickets',
  {
    id: id(),
    number: text('number').notNull(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    subject: text('subject').notNull(),
    description: text('description').notNull(),
    priority: priority('priority').notNull().default('medium'),
    category: text('category').notNull().default('general'),
    status: ticketStatus('status').notNull().default('open'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('tickets_number_uq').on(t.number),
    index('tickets_client_idx').on(t.clientId),
    index('tickets_assignee_idx').on(t.assigneeId),
    index('tickets_status_idx').on(t.status),
  ]
);

export const ticketComments = pgTable(
  'ticket_comments',
  {
    id: id(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    isInternal: boolean('is_internal').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('ticket_comments_ticket_idx').on(t.ticketId)]
);

// ---------------------------------------------------------------------------
// Meetings & calendar
// ---------------------------------------------------------------------------
export const meetings = pgTable(
  'meetings',
  {
    id: id(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    agenda: text('agenda').notNull().default(''),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    organizerId: uuid('organizer_id').references(() => users.id, { onDelete: 'set null' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(30),
    meetingLink: text('meeting_link'),
    provider: meetingProvider('provider').notNull().default('manual'),
    googleEventId: text('google_event_id'),
    status: meetingStatus('status').notNull().default('scheduled'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('meetings_client_idx').on(t.clientId),
    index('meetings_project_idx').on(t.projectId),
    index('meetings_starts_idx').on(t.startsAt),
  ]
);

export const meetingAttendees = pgTable(
  'meeting_attendees',
  {
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.meetingId, t.userId] }), index('meeting_attendees_user_idx').on(t.userId)]
);

export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: id(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    type: calendarEventType('type').notNull().default('event'),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
    audience: audienceType('audience').notNull().default('all'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('calendar_events_starts_idx').on(t.startsOn)]
);

// ---------------------------------------------------------------------------
// Notifications & announcements
// ---------------------------------------------------------------------------
export const announcements = pgTable('announcements', {
  id: id(),
  kind: announcementKind('kind').notNull().default('general'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  priority: notificationPriority('priority').notNull().default('normal'),
  effectiveDate: date('effective_date'),
  /** Human-readable audience summary, e.g. "All employees", "3 clients". */
  audienceLabel: text('audience_label').notNull(),
  attachmentDocumentId: uuid('attachment_document_id').references(() => documents.id, {
    onDelete: 'set null',
  }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
});

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    link: text('link'),
    priority: notificationPriority('priority').notNull().default('normal'),
    announcementId: uuid('announcement_id').references(() => announcements.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('notifications_user_created_idx').on(t.userId, t.createdAt),
    index('notifications_user_unread_idx').on(t.userId).where(sql`${t.readAt} is null`),
  ]
);

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------
export const leads = pgTable(
  'leads',
  {
    id: id(),
    name: text('name').notNull(),
    company: text('company'),
    email: text('email').notNull(),
    phone: text('phone'),
    source: leadSource('source').notNull().default('manual'),
    serviceInterested: text('service_interested'),
    status: leadStatus('status').notNull().default('new'),
    estimatedValuePaise: money('estimated_value_paise'),
    notes: text('notes').notNull().default(''),
    followUpAt: timestamp('follow_up_at', { withTimezone: true }),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    convertedClientId: uuid('converted_client_id').references(() => clients.id, { onDelete: 'set null' }),
    /** First-touch attribution: utm_* params, referrer, landing page. */
    attribution: jsonb('attribution').notNull().default({}),
    /** Structured answers from the Free DevOps & Cloud Assessment. */
    assessment: jsonb('assessment'),
    followUpNotifiedAt: timestamp('follow_up_notified_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('leads_status_idx').on(t.status),
    index('leads_assigned_idx').on(t.assignedTo),
    index('leads_follow_up_idx').on(t.followUpAt),
  ]
);

// ---------------------------------------------------------------------------
// Activity, audit, HR, approvals, settings
// ---------------------------------------------------------------------------
/**
 * Business activity timeline (what happened on a client/project/lead).
 * Scoped by client/project like the entity it describes; `client`
 * visibility rows are shown on the client's own timeline.
 */
export const activities = pgTable(
  'activities',
  {
    id: id(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    summary: text('summary').notNull(),
    visibility: visibility('visibility').notNull().default('internal'),
    createdAt: createdAt(),
  },
  (t) => [
    index('activities_entity_idx').on(t.entityType, t.entityId),
    index('activities_client_idx').on(t.clientId, t.createdAt),
    index('activities_project_idx').on(t.projectId, t.createdAt),
    index('activities_lead_idx').on(t.leadId),
    index('activities_created_idx').on(t.createdAt),
  ]
);

/** Security/compliance audit trail. Append-only from application code. */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorEmail: text('actor_email'),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_logs_created_idx').on(t.createdAt),
    index('audit_logs_actor_idx').on(t.actorId, t.createdAt),
    index('audit_logs_action_idx').on(t.action),
  ]
);

export const leaveRequests = pgTable(
  'leave_requests',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: leaveType('type').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    reason: text('reason').notNull().default(''),
    status: reviewStatus('status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    createdAt: createdAt(),
  },
  (t) => [index('leave_requests_user_idx').on(t.userId), index('leave_requests_dates_idx').on(t.startDate)]
);

export const changeRequests = pgTable(
  'change_requests',
  {
    id: id(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    requestedBy: uuid('requested_by').references(() => users.id, { onDelete: 'set null' }),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    field: text('field').notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value').notNull(),
    reason: text('reason').notNull().default(''),
    status: reviewStatus('status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    createdAt: createdAt(),
  },
  (t) => [index('change_requests_client_idx').on(t.clientId), index('change_requests_status_idx').on(t.status)]
);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: updatedAt(),
});

/** Atomic human-readable number sequences (invoice, ticket, project, client). */
export const counters = pgTable('counters', {
  key: text('key').primaryKey(),
  value: integer('value').notNull().default(0),
});
