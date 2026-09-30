import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { db } from '@/server/db';
import { activities, leads, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { isUuid, leadScope } from '@/server/scope';
import { internalPeople } from '@/server/queries/people';
import { Badge, KeyValue, PageHeader, Panel, StatusBadge, Timeline } from '@/components/portal/ui';
import { ConvertLeadButton, EditLeadButton, LogActivityForm } from '@/components/portal/leads/LeadUI';
import { formatINR } from '@/lib/portal/invoice-math';
import { fmtDateTime, humanize } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Lead' };

const ASSESSMENT_LABELS: Record<string, string> = {
  currentCloud: 'Current cloud',
  infrastructure: 'Infrastructure',
  monthlySpend: 'Monthly cloud spend',
  deploymentFrequency: 'Deployment frequency',
  problems: 'Current problems',
  problemDetails: 'Details',
  companySize: 'Company size',
};

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!viewer.isInternal || !isUuid(id)) notFound();
  const [row] = await db.select({ l: leads, owner: users.name }).from(leads).leftJoin(users, eq(users.id, leads.assignedTo)).where(and(eq(leads.id, id), leadScope(viewer)));
  if (!row) notFound();
  const { l } = row;
  const history = await db
    .select({ a: activities, actor: users.name })
    .from(activities)
    .leftJoin(users, eq(users.id, activities.actorId))
    .where(eq(activities.leadId, id))
    .orderBy(desc(activities.createdAt));
  const manage = can(viewer, 'leads.manage');
  const editable = manage || l.assignedTo === viewer.id;
  const people = editable ? await internalPeople(viewer) : [];
  const attribution = l.attribution as Record<string, string>;
  const assessment = (l.assessment ?? null) as Record<string, string | string[]> | null;
  const ist = l.followUpAt ? new Date(l.followUpAt.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 16) : null;

  return (
    <>
      <Link href="/portal/leads" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand">
        <ArrowLeft className="h-3.5 w-3.5" /> All leads
      </Link>
      <PageHeader
        eyebrow={humanize(l.source)}
        title={l.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={l.status} />
            {l.company && <span>{l.company}</span>}
          </span>
        }
        actions={
          <>
            {editable && (
              <EditLeadButton
                canAssign={manage}
                people={people}
                initial={{ id: l.id, name: l.name, company: l.company, email: l.email, phone: l.phone, source: l.source, serviceInterested: l.serviceInterested, status: l.status, estimatedValuePaise: l.estimatedValuePaise, followUpAt: ist, assignedTo: l.assignedTo, notes: l.notes }}
              />
            )}
            {l.convertedClientId ? (
              <Link href={`/portal/clients/${l.convertedClientId}`} className="inline-flex h-10 items-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700">
                View client account
              </Link>
            ) : (
              editable && can(viewer, 'clients.manage') && l.status !== 'lost' && <ConvertLeadButton id={l.id} />
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {assessment && (
            <Panel title="Free Cloud Assessment answers" description="Submitted from the website">
              <KeyValue items={Object.entries(ASSESSMENT_LABELS).filter(([k]) => assessment[k] && String(assessment[k]).length).map(([k, label]) => ({ label, value: Array.isArray(assessment[k]) ? (assessment[k] as string[]).join(', ') : String(assessment[k]) }))} />
            </Panel>
          )}
          <Panel title="Activity history">
            {editable && (
              <div className="mb-5">
                <LogActivityForm id={l.id} />
              </div>
            )}
            <Timeline items={history.map((h) => ({ id: h.a.id, title: h.a.summary, meta: `${h.actor ?? 'Website'} · ${fmtDateTime(h.a.createdAt)}` }))} />
          </Panel>
          {l.notes && (
            <Panel title="Notes">
              <p className="whitespace-pre-wrap text-sm text-slate-700">{l.notes}</p>
            </Panel>
          )}
        </div>
        <div className="space-y-6">
          <Panel title="Contact">
            <div className="space-y-1.5 text-sm">
              <a href={`mailto:${l.email}`} className="flex items-center gap-2 text-brand hover:underline">
                <Mail className="h-4 w-4" /> {l.email}
              </a>
              {l.phone && (
                <a href={`tel:${l.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-slate-700 hover:text-brand">
                  <Phone className="h-4 w-4" /> {l.phone}
                </a>
              )}
            </div>
          </Panel>
          <Panel title="Deal">
            <KeyValue
              items={[
                { label: 'Estimated value', value: l.estimatedValuePaise ? formatINR(l.estimatedValuePaise) : null },
                { label: 'Service interested', value: l.serviceInterested },
                { label: 'Salesperson', value: row.owner },
                { label: 'Next follow-up', value: l.followUpAt ? fmtDateTime(l.followUpAt) : null },
                { label: 'Created', value: fmtDateTime(l.createdAt) },
              ]}
            />
          </Panel>
          <Panel title="Attribution" description="First touch on the website">
            {Object.keys(attribution).length === 0 ? (
              <p className="text-sm text-slate-500">No tracking data.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(attribution).map(([k, v]) => (
                  <Badge key={k} tone="slate">
                    {k.replace('utm_', '')}: {k === 'firstSeen' ? fmtDateTime(v) : v}
                  </Badge>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
