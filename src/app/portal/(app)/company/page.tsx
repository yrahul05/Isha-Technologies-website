import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { FileEdit, Mail, Phone } from 'lucide-react';
import { db } from '@/server/db';
import { clientUsers, clients, users } from '@/server/db/schema';
import { requireViewer } from '@/server/auth/viewer';
import { Avatar, Badge, KeyValue, PageHeader, Panel } from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import { humanize, relativeTime } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Company profile' };

export default async function CompanyPage() {
  const viewer = await requireViewer();
  if (viewer.isInternal || !viewer.clientId) notFound();
  const [client] = await db.select().from(clients).where(eq(clients.id, viewer.clientId));
  const [colleagues, manager] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, title: users.title, role: clientUsers.role, lastLoginAt: users.lastLoginAt, isActive: users.isActive })
      .from(clientUsers)
      .innerJoin(users, eq(users.id, clientUsers.userId))
      .where(eq(clientUsers.clientId, viewer.clientId))
      .orderBy(asc(users.name)),
    client.accountManagerId ? db.select({ name: users.name, email: users.email, phone: users.phone, title: users.title }).from(users).where(eq(users.id, client.accountManagerId)) : Promise.resolve([]),
  ]);
  const address = [client.addressLine1, client.addressLine2, [client.city, client.state, client.postalCode].filter(Boolean).join(', '), client.country].filter(Boolean).join('\n');

  return (
    <>
      <PageHeader
        eyebrow={client.code}
        title={client.companyName}
        description="Your account details on record with Isha Technologies."
        actions={
          <Button asChild variant="secondary" className="h-10 rounded-lg px-4 text-sm">
            <Link href={`/portal/change-requests?entity=client&id=${client.id}`}>
              <FileEdit className="h-4 w-4" /> Request a change
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Company & billing details" description="Used on your invoices. Changes go through a reviewed request.">
            <KeyValue
              items={[
                { label: 'Legal name', value: client.legalName },
                { label: 'GSTIN', value: client.gstin ? <span className="font-mono">{client.gstin}</span> : null },
                { label: 'PAN', value: client.pan },
                { label: 'Primary contact', value: client.contactName },
                { label: 'Email', value: client.email },
                { label: 'Phone', value: client.phone },
                { label: 'Billing address', value: <span className="whitespace-pre-line">{address}</span> },
                { label: 'Website', value: client.website },
              ]}
            />
          </Panel>
          <Panel title="People at your company with portal access">
            <ul className="divide-y divide-gray-100">
              {colleagues.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={c.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">
                      {c.name} {c.id === viewer.id && <span className="text-xs text-slate-400">(you)</span>}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {c.title ?? c.email} · {c.lastLoginAt ? `active ${relativeTime(c.lastLoginAt)}` : 'not signed in yet'}
                    </span>
                  </span>
                  <Badge tone={c.role === 'owner' ? 'brand' : 'slate'}>{humanize(c.role)}</Badge>
                  {!c.isActive && <Badge tone="red">Deactivated</Badge>}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">Need to add or remove someone? Raise a support ticket and we&rsquo;ll set it up.</p>
          </Panel>
        </div>
        <Panel title="Your account manager">
          {manager[0] ? (
            <div className="flex items-start gap-3">
              <Avatar name={manager[0].name} size="lg" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-900">{manager[0].name}</p>
                <p className="text-slate-500">{manager[0].title}</p>
                <a href={`mailto:${manager[0].email}`} className="flex items-center gap-1.5 text-brand hover:underline">
                  <Mail className="h-3.5 w-3.5" /> {manager[0].email}
                </a>
                {manager[0].phone && (
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="h-3.5 w-3.5" /> {manager[0].phone}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Your Isha Technologies team will be in touch.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
