import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { db } from '@/server/db';
import { auditLogs, clientUsers, clients, sessions, users } from '@/server/db/schema';
import { requirePermission } from '@/server/auth/viewer';
import { Badge, EmptyState, KeyValue, PageHeader, Panel, Table, Td, Th, Tr } from '@/components/portal/ui';
import { AccountControls, EditAccountForm, ResetPasswordForm } from '@/components/portal/users/UserForms';
import { ROLE_LABELS } from '@/lib/portal/permissions';
import { fmtDateTime, relativeTime } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Manage user' };

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.login_failed': 'Failed sign-in',
  'auth.login_blocked': 'Sign-in blocked (too many attempts)',
  'auth.logout': 'Signed out',
  'auth.password_changed': 'Changed own password',
  'user.password_set_by_admin': 'Password reset by an administrator',
  'user.force_password_change': 'Forced password change toggled',
  'user.created': 'Account created',
  'user.updated': 'Account updated',
  'user.activated': 'Account enabled',
  'user.deactivated': 'Account disabled',
  'user.role_changed': 'Role changed',
  'security.session_revoked': 'Sessions revoked',
  'auth.mfa_enabled': 'Two-factor enabled',
  'auth.mfa_disabled': 'Two-factor disabled',
};

export default async function ManageUserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const viewer = await requirePermission('users.manage');
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // Deliberately selects NO password column: a password (or its hash) can never reach this page.
  const [u] = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      passwordSet: sql<boolean>`${users.passwordHash} is not null`,
      passwordChangedAt: users.passwordChangedAt,
      forcePasswordChange: users.forcePasswordChange,
      createdAt: users.createdAt,
      company: clients.companyName,
      clientId: clients.id,
    })
    .from(users)
    .leftJoin(clientUsers, eq(clientUsers.userId, users.id))
    .leftJoin(clients, eq(clients.id, clientUsers.clientId))
    .where(eq(users.id, id));
  if (!u) notFound();

  const manageable = u.id !== viewer.id && (viewer.isSuperAdmin ? u.role !== 'super_admin' : u.role === 'employee' || u.role === 'client');
  const [{ n: activeSessions }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sessions)
    .where(and(eq(sessions.userId, u.id), sql`${sessions.expiresAt} > now()`));

  const activity = await db
    .select({ id: auditLogs.id, action: auditLogs.action, actorEmail: auditLogs.actorEmail, ip: auditLogs.ip, createdAt: auditLogs.createdAt, entityId: auditLogs.entityId })
    .from(auditLogs)
    .where(
      and(
        or(and(eq(auditLogs.entityType, 'user'), eq(auditLogs.entityId, u.id)), eq(auditLogs.actorId, u.id)),
        sql`(${auditLogs.action} like 'auth.%' or ${auditLogs.action} like 'user.%' or ${auditLogs.action} like 'security.%')`
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(40);

  return (
    <>
      <Link href="/portal/users" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> User management
      </Link>
      <PageHeader eyebrow={ROLE_LABELS[u.role]} title={u.name} description={`${u.email}${u.company ? ` · ${u.company}` : ''}`} />
      {sp.created && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Account created. Share the initial password with the person yourself; it cannot be shown again.
        </p>
      )}
      {!manageable && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          {u.id === viewer.id ? 'This is your own account. Change your password from Settings → Security.' : 'You can view this account but only a Super Admin can manage it.'}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          {manageable && (
            <Panel title="Profile & sign-in" description="Username and email are the sign-in identifiers.">
              <EditAccountForm user={{ id: u.id, name: u.name, username: u.username, email: u.email, phone: u.phone }} />
            </Panel>
          )}
          {manageable && (
            <div id="password">
              <Panel title="Reset password" description="Enter a NEW password. The old one is replaced and all of the user's sessions end. Tell the user the new password yourself.">
                <ResetPasswordForm userId={u.id} />
              </Panel>
            </div>
          )}
          <div id="activity">
            <Panel title="Security activity" description="Sign-ins, password changes and account actions for this user. Passwords are never recorded.">
              {activity.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No security activity yet" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>When</Th>
                        <Th>Event</Th>
                        <Th>By</Th>
                        <Th>IP address</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.map((a) => (
                        <Tr key={a.id}>
                          <Td className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(a.createdAt)}</Td>
                          <Td className="text-sm">{ACTION_LABELS[a.action] ?? a.action}</Td>
                          <Td className="text-xs text-slate-500">{a.actorEmail ?? 'system'}</Td>
                          <Td className="font-mono text-xs text-slate-500">{a.ip ?? '—'}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Panel>
          </div>
        </div>
        <div className="space-y-6">
          <Panel title="Account & password status">
            <KeyValue
              items={[
                { label: 'Username', value: <span className="font-mono text-sm">{u.username ?? '—'}</span> },
                { label: 'Status', value: u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge> },
                { label: 'Password status', value: u.passwordSet ? <Badge tone="green">Set</Badge> : <Badge tone="amber">Not set</Badge> },
                { label: 'Last password change', value: u.passwordChangedAt ? fmtDateTime(u.passwordChangedAt) : '—' },
                { label: 'Force password change', value: u.forcePasswordChange ? <Badge tone="amber">Required at next sign-in</Badge> : 'No' },
                { label: 'Last login', value: u.lastLoginAt ? `${fmtDateTime(u.lastLoginAt)} (${relativeTime(u.lastLoginAt)})` : 'Never' },
                { label: 'Active sessions', value: activeSessions },
                { label: 'Created', value: fmtDateTime(u.createdAt) },
              ]}
            />
            <p className="mt-3 text-xs text-slate-500">Passwords are stored only as one-way hashes and cannot be viewed or recovered by anyone. You can only set a new one.</p>
          </Panel>
          {manageable && (
            <Panel title="Account controls">
              <AccountControls userId={u.id} isActive={u.isActive} force={u.forcePasswordChange} isSelf={u.id === viewer.id} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
