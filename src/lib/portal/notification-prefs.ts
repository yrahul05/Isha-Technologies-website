/**
 * Notification categories users can switch on/off (in-app + email).
 * `security` is always delivered and cannot be disabled.
 */
export type NotificationCategory = 'meeting' | 'task' | 'invoice' | 'project' | 'ticket' | 'announcement' | 'security' | 'other';

export const PREFERENCE_CATEGORIES: { key: Exclude<NotificationCategory, 'other'>; label: string; description: string; locked?: boolean }[] = [
  { key: 'meeting', label: 'Meetings', description: 'Scheduled, rescheduled, cancelled and requested meetings' },
  { key: 'task', label: 'Tasks & requests', description: 'Assignments, status changes, comments and work requests' },
  { key: 'invoice', label: 'Invoices & payments', description: 'New invoices, payments received, overdue and renewal reminders' },
  { key: 'project', label: 'Projects & documents', description: 'Project updates, documents, proposals, contracts and change requests' },
  { key: 'ticket', label: 'Support tickets', description: 'New tickets, replies and status changes' },
  { key: 'announcement', label: 'Announcements', description: 'Company announcements, holidays and notices' },
  { key: 'security', label: 'Security', description: 'Password changes, new sign-ins, verification codes — always on', locked: true },
];

export function categoryOf(type: string): NotificationCategory {
  const t = type.toLowerCase();
  if (t.startsWith('security') || t.startsWith('auth')) return 'security';
  if (t.startsWith('meeting')) return 'meeting';
  if (t.startsWith('task') || t.startsWith('task_request')) return 'task';
  if (t.startsWith('invoice') || t.startsWith('payment') || t.startsWith('renewal')) return 'invoice';
  if (t.startsWith('project') || t.startsWith('document') || t.startsWith('change_request') || t.startsWith('proposal') || t.startsWith('contract')) return 'project';
  if (t.startsWith('ticket')) return 'ticket';
  if (t.startsWith('announcement')) return 'announcement';
  return 'other';
}
