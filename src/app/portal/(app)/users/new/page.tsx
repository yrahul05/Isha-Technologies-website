import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, ne } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/server/db';
import { clients } from '@/server/db/schema';
import { requirePermission } from '@/server/auth/viewer';
import { PageHeader, Panel } from '@/components/portal/ui';
import { CreateUserForm } from '@/components/portal/users/UserForms';

export const metadata: Metadata = { title: 'Create user' };

export default async function NewUserPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const viewer = await requirePermission('users.manage');
  const params = await searchParams;
  const list = await db.select({ id: clients.id, name: clients.companyName }).from(clients).where(ne(clients.status, 'inactive')).orderBy(asc(clients.companyName));
  const role = params.role === 'client' || params.role === 'admin' ? params.role : 'employee';

  return (
    <>
      <Link href="/portal/users" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> User management
      </Link>
      <PageHeader eyebrow="Administration" title="Create user" description="There is no self-registration. You choose the initial password and share it with the person yourself." />
      <Panel>
        <CreateUserForm canCreateAdmin={viewer.isSuperAdmin} clients={list} defaultRole={role === 'admin' && !viewer.isSuperAdmin ? 'employee' : role} defaultClientId={params.clientId} />
      </Panel>
    </>
  );
}
