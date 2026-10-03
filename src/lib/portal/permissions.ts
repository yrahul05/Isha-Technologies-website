/**
 * Permission catalogue and default role grants.
 *
 * Pure data, importable from client components for *display* decisions
 * (e.g. hiding a button). Every real decision is made on the server from
 * the permissions stored in the database — see src/server/auth/viewer.ts.
 *
 * Internal-reach permissions (`*.view_all`, finance, audit…) are only ever
 * honoured for internal roles. A `client` user is always scoped to their
 * own account in SQL regardless of what is granted here, so a mistaken
 * settings change can never open one client's data to another.
 */
export const ROLE_KEYS = ['super_admin', 'admin', 'employee', 'client'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  employee: 'Team Member',
  client: 'Client',
};

export const PERMISSIONS = [
  { key: 'clients.view', label: 'View all clients', group: 'Clients' },
  { key: 'clients.manage', label: 'Create & edit clients, client logins', group: 'Clients' },
  { key: 'projects.view_all', label: 'View every project', group: 'Projects' },
  { key: 'projects.manage', label: 'Create & edit projects, assign members', group: 'Projects' },
  { key: 'tasks.view_all', label: 'View every task', group: 'Tasks' },
  { key: 'tasks.manage', label: 'Create, assign & edit any task', group: 'Tasks' },
  { key: 'task_requests.review', label: 'Approve or reject client work requests', group: 'Tasks' },
  { key: 'documents.view_all', label: 'View every document', group: 'Documents' },
  { key: 'documents.manage', label: 'Upload, rename & delete documents', group: 'Documents' },
  { key: 'invoices.view', label: 'View invoices & payments', group: 'Finance' },
  { key: 'invoices.manage', label: 'Create & edit invoices', group: 'Finance' },
  { key: 'payments.record', label: 'Record payments', group: 'Finance' },
  { key: 'tickets.view_all', label: 'View every ticket', group: 'Support' },
  { key: 'tickets.manage', label: 'Assign & update tickets', group: 'Support' },
  { key: 'meetings.view_all', label: 'View every meeting', group: 'Meetings' },
  { key: 'meetings.manage', label: 'Schedule meetings for others', group: 'Meetings' },
  { key: 'team.view', label: 'View team directory & workload', group: 'Team' },
  { key: 'team.manage', label: 'Add & edit team members', group: 'Team' },
  { key: 'users.manage', label: 'Create user accounts, set/reset passwords, enable/disable, revoke sessions', group: 'Team' },
  { key: 'leave.review', label: 'Approve leave requests', group: 'Team' },
  { key: 'leads.view', label: 'View all leads', group: 'CRM' },
  { key: 'leads.manage', label: 'Create, assign & edit leads', group: 'CRM' },
  { key: 'proposals.view', label: 'View all proposals & quotations', group: 'CRM' },
  { key: 'proposals.manage', label: 'Create, send & convert proposals', group: 'CRM' },
  { key: 'contracts.view', label: 'View all contracts', group: 'CRM' },
  { key: 'contracts.manage', label: 'Create & edit contracts', group: 'CRM' },
  { key: 'time.log', label: 'Log own working time', group: 'Delivery' },
  { key: 'time.view_all', label: 'View all timesheets & project profitability', group: 'Delivery' },
  { key: 'renewals.view', label: 'View the Renewal & Expiry Center', group: 'Finance' },
  { key: 'renewals.manage', label: 'Create & edit renewals', group: 'Finance' },
  { key: 'analytics.view', label: 'View executive business analytics', group: 'Governance' },
  { key: 'ai.use', label: 'Use the Isha AI assistant', group: 'Governance' },
  { key: 'notifications.send', label: 'Send targeted notifications & announcements', group: 'Communication' },
  { key: 'calendar.manage', label: 'Manage holidays & company events', group: 'Communication' },
  { key: 'change_requests.review', label: 'Approve client change requests', group: 'Governance' },
  { key: 'reports.view', label: 'View business reports', group: 'Governance' },
  { key: 'audit.view', label: 'View audit logs', group: 'Governance' },
  { key: 'security.manage', label: 'Security dashboard & revoke user sessions', group: 'Governance' },
  { key: 'settings.manage', label: 'Manage system settings', group: 'Governance' },
] as const;

export type Permission = (typeof PERMISSIONS)[number]['key'];

const ALL = PERMISSIONS.map((p) => p.key) as Permission[];

/** Seeded defaults. Super Admin is implicit-all in code; Admin/Employee are editable in Settings. */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  super_admin: ALL,
  // Client work requests are reviewed by the Super Admin by default; grant
  // task_requests.review to Admin in Settings to delegate it.
  admin: ALL.filter((p) => !['audit.view', 'settings.manage', 'security.manage', 'task_requests.review'].includes(p)),
  employee: ['team.view', 'time.log', 'ai.use'],
  client: [],
};

/** Permissions a client-role user can never hold, whatever the database says. */
export const INTERNAL_ONLY_PERMISSIONS: ReadonlySet<Permission> = new Set(ALL);

/** Permission sets Super Admin may edit in Settings → Roles & Permissions. */
export const EDITABLE_ROLES: RoleKey[] = ['admin', 'employee'];
