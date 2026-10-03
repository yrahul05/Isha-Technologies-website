import type { Metadata } from 'next';
import { asc, isNull, ne } from 'drizzle-orm';
import { db } from '@/server/db';
import { clients, documents, projects } from '@/server/db/schema';
import { requirePermission } from '@/server/auth/viewer';
import { PageHeader } from '@/components/portal/ui';
import { ContractForm } from '@/components/portal/contracts/ContractForms';

export const metadata: Metadata = { title: 'New contract' };

export default async function NewContractPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  await requirePermission('contracts.manage');
  const { client } = await searchParams;
  const [clientRows, projectRows, docRows] = await Promise.all([
    db.select({ id: clients.id, name: clients.companyName }).from(clients).where(ne(clients.status, 'inactive')).orderBy(asc(clients.companyName)),
    db.select({ id: projects.id, name: projects.name, clientId: projects.clientId }).from(projects).orderBy(asc(projects.name)),
    db.select({ id: documents.id, name: documents.name, clientId: documents.clientId }).from(documents).where(isNull(documents.deletedAt)).orderBy(asc(documents.name)).limit(500),
  ]);
  return (
    <>
      <PageHeader eyebrow="Business" title="New contract" />
      <ContractForm clients={clientRows} projects={projectRows} documents={docRows.filter((d): d is { id: string; name: string; clientId: string } => Boolean(d.clientId))} defaultClientId={client} />
    </>
  );
}
