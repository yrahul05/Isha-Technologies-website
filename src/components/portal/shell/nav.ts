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
          item('/portal/tasks', 'Action items', 'tasks'),
          item('/portal/meetings', 'Meetings', 'meetings'),
          item('/portal/documents', 'Documents', 'documents'),
        ],
      },
      {
        label: 'Account',
        items: [
          item('/portal/invoices', 'Invoices & payments', 'invoices'),
          item('/portal/tickets', 'Support', 'tickets'),
          item('/portal/company', 'Company profile', 'company'),
          item('/portal/change-requests', 'Change requests', 'changes'),
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
        item('/portal/meetings', 'Meetings', 'meetings'),
        item('/portal/documents', 'Documents', 'documents'),
        item('/portal/tickets', 'Tickets', 'tickets'),
      ],
    },
  ];

  const business: NavItem[] = [];
  if (can(v, 'clients.view')) business.push(item('/portal/clients', 'Clients', 'clients'));
  business.push(item('/portal/leads', 'Leads', 'leads'));
  if (can(v, 'invoices.view')) business.push(item('/portal/invoices', 'Invoices', 'invoices'));
  if (can(v, 'reports.view')) business.push(item('/portal/reports', 'Reports', 'reports'));
  groups.push({ label: 'Business', items: business });

  const team: NavItem[] = [];
  if (can(v, 'team.view')) team.push(item('/portal/team', 'Team', 'team'));
  team.push(item('/portal/leave', 'Leave', 'leave'));
  team.push(item('/portal/announcements', 'Announcements', 'announcements'));
  groups.push({ label: 'Team', items: team });

  const gov: NavItem[] = [];
  if (can(v, 'change_requests.review')) gov.push(item('/portal/change-requests', 'Change requests', 'changes'));
  if (can(v, 'audit.view')) gov.push(item('/portal/audit', 'Audit log', 'audit'));
  gov.push(item('/portal/settings', 'Settings', 'settings'));
  groups.push({ label: 'Governance', items: gov });

  return groups;
}
