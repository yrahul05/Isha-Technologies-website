import 'server-only';
import { can, type Viewer } from '@/server/auth/viewer';
import type { NavIconKey } from './icons';

export type NavItem = { href: string; label: string; icon: NavIconKey; badge?: number };
export type NavGroup = { label: string; items: NavItem[] };

/**
 * Navigation for the current viewer. Built on the server from real
 * permissions — purely a convenience; every page enforces access itself.
 */
export function buildNav(v: Viewer, badges: Partial<Record<string, number>> = {}): NavGroup[] {
  const item = (href: string, label: string, icon: NavIconKey): NavItem => ({ href, label, icon, badge: badges[href] });

  if (!v.isInternal) {
    return [
      { label: 'Overview', items: [item('/portal/dashboard', 'Dashboard', 'dashboard'), item('/portal/calendar', 'Calendar', 'calendar'), item('/portal/notifications', 'Notifications', 'bell')] },
      {
        label: 'Your work',
        items: [
          item('/portal/projects', 'Projects', 'projects'),
          item('/portal/requests', 'Work requests', 'requests'),
          item('/portal/tasks', 'Action items', 'tasks'),
          item('/portal/meetings', 'Meetings', 'meetings'),
          item('/portal/documents', 'Documents', 'documents'),
        ],
      },
      {
        label: 'Account',
        items: [
          item('/portal/proposals', 'Proposals', 'proposals'),
          item('/portal/contracts', 'Contracts', 'contracts'),
          item('/portal/invoices', 'Invoices & payments', 'invoices'),
          item('/portal/tickets', 'Support', 'tickets'),
          item('/portal/company', 'Company profile', 'company'),
          item('/portal/change-requests', 'Change requests', 'changes'),
          item('/portal/assistant', 'Isha AI', 'assistant'),
        ],
      },
    ];
  }

  const groups: NavGroup[] = [
    { label: 'Overview', items: [item('/portal/dashboard', 'Dashboard', 'dashboard'), item('/portal/calendar', 'Calendar', 'calendar'), item('/portal/notifications', 'Notifications', 'bell')] },
    {
      label: 'Delivery',
      items: [
        item('/portal/projects', 'Projects', 'projects'),
        item('/portal/tasks', 'Tasks', 'tasks'),
        ...(can(v, 'time.log') || can(v, 'time.view_all') ? [item('/portal/time', 'Time tracking', 'time')] : []),
        ...(can(v, 'task_requests.review') || can(v, 'tasks.manage') ? [item('/portal/requests', 'Client requests', 'requests')] : []),
        item('/portal/meetings', 'Meetings', 'meetings'),
        item('/portal/documents', 'Documents', 'documents'),
        item('/portal/tickets', 'Tickets', 'tickets'),
      ],
    },
  ];

  const business: NavItem[] = [];
  if (can(v, 'clients.view')) business.push(item('/portal/clients', 'Clients', 'clients'));
  business.push(item('/portal/leads', 'Leads', 'leads'));
  if (can(v, 'proposals.view')) business.push(item('/portal/proposals', 'Proposals', 'proposals'));
  if (can(v, 'contracts.view')) business.push(item('/portal/contracts', 'Contracts', 'contracts'));
  if (can(v, 'invoices.view')) business.push(item('/portal/invoices', 'Invoices', 'invoices'));
  if (can(v, 'renewals.view')) business.push(item('/portal/renewals', 'Renewals', 'renewals'));
  if (can(v, 'time.view_all')) business.push(item('/portal/profitability', 'Profitability', 'profitability'));
  if (can(v, 'analytics.view')) business.push(item('/portal/analytics', 'Analytics', 'analytics'));
  if (can(v, 'reports.view')) business.push(item('/portal/reports', 'Reports', 'reports'));
  groups.push({ label: 'Business', items: business });

  const team: NavItem[] = [];
  if (can(v, 'team.view')) team.push(item('/portal/team', 'Team', 'team'));
  team.push(item('/portal/leave', 'Leave', 'leave'));
  team.push(item('/portal/announcements', 'Announcements', 'announcements'));
  groups.push({ label: 'Team', items: team });

  if (can(v, 'ai.use')) groups[0].items.push(item('/portal/assistant', 'Isha AI', 'assistant'));

  const gov: NavItem[] = [];
  if (can(v, 'change_requests.review')) gov.push(item('/portal/change-requests', 'Change requests', 'changes'));
  if (can(v, 'audit.view')) gov.push(item('/portal/audit', 'Audit log', 'audit'));
  if (can(v, 'security.manage')) gov.push(item('/portal/security', 'Security', 'security'));
  gov.push(item('/portal/settings', 'Settings', 'settings'));
  groups.push({ label: 'Governance', items: gov });

  return groups;
}
