import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { UserPlus, UsersRound } from 'lucide-react';
import { db } from '@/server/db';
import { clientUsers, clients, users } from '@/server/db/schema';
import { can, requirePermission } from '@/server/auth/viewer';
import { Avatar, Badge, EmptyState, PageHeader, Panel, Table, Td, Th, Tr } from '@/components/portal/ui';
import { UserRowActions } from '@/components/portal/users/UserForms';
import { ROLE_LABELS } from '@/lib/portal/permissions';
import { fmtDate, relativeTime } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'User management' };

/** Super Admin / Admin only (users.manage). Passwords are never selected, so they cannot be displayed. */
export default async function UsersPage() {
  const viewer = await requirePermission('users.manage');

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      passwordChangedAt: users.passwordChangedAt,
      forcePasswordChange: users.forcePasswordChange,
      createdAt: users.createdAt,
      company: clients.companyName,
    })
    .from(users)
    .leftJoin(clientUsers, eq(clientUsers.userId, users.id))
    .leftJoin(clients, eq(clients.id, clientUsers.clientId))
    .orderBy(asc(users.name));

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="User management"
        description="Accounts are created by administrators only. Set or reset a password here; existing passwords can never be viewed."
        actions={
          <Link href="/portal/users/new" className="inline-flex h-10 items-center gap-2 rounded-md border border-brand bg-brand px-4 text-sm font-medium text-white hover:bg-white hover:text-brand">
            <UserPlus className="h-4 w-4" /> Create user
          </Link>
        }
      />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={UsersRound} title="No users yet" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Username</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Company</Th>
                  <Th>Status</Th>
                  <Th>Last login</Th>
                  <Th>Last password change</Th>
                  <Th>Force change</Th>
                  <Th>Created</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  // An Admin can't manage Admins or Super Admins; only a Super Admin can.
                  const manageable = u.id !== viewer.id && (viewer.isSuperAdmin ? u.role !== 'super_admin' : u.role === 'employee' || u.role === 'client');
                  return (
                    <Tr key={u.id} className={u.isActive ? '' : 'opacity-60'}>
                      <Td>
                        <Link href={`/portal/users/${u.id}`} className="group flex items-center gap-3">
                          <Avatar name={u.name} />
                          <span className="font-semibold text-slate-900 group-hover:text-brand">{u.name}</span>
                        </Link>
                      </Td>
                      <Td className="font-mono text-xs">{u.username ?? '—'}</Td>
                      <Td className="text-xs">{u.email}</Td>
                      <Td>
                        <Badge tone={u.role === 'super_admin' ? 'violet' : u.role === 'admin' ? 'brand' : u.role === 'client' ? 'amber' : 'slate'}>{ROLE_LABELS[u.role]}</Badge>
                      </Td>
                      <Td className="text-xs">{u.company ?? (u.role === 'client' ? '—' : 'Isha Technologies')}</Td>
                      <Td>{u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>}</Td>
                      <Td className="text-xs text-slate-500">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : 'Never'}</Td>
                      <Td className="text-xs text-slate-500">{u.passwordChangedAt ? fmtDate(u.passwordChangedAt) : '—'}</Td>
                      <Td>{u.forcePasswordChange ? <Badge tone="amber">Required</Badge> : <span className="text-xs text-slate-400">No</span>}</Td>
                      <Td className="text-xs text-slate-500">{fmtDate(u.createdAt)}</Td>
                      <Td>
                        <UserRowActions userId={u.id} isActive={u.isActive} force={u.forcePasswordChange} canManage={manageable && can(viewer, 'users.manage')} />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Panel>
    </>
  );
}
