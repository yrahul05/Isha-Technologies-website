import type { Metadata } from 'next';
import { count } from 'drizzle-orm';
import { Download, FileClock } from 'lucide-react';
import { db } from '@/server/db';
import { auditLogs } from '@/server/db/schema';
import { requirePermission } from '@/server/auth/viewer';
import { auditRows, auditWhere, deviceLabel, type AuditFilters } from '@/server/queries/audit';
import { Badge, EmptyState, PageHeader, Pagination, Panel, Table, Td, Th, Tr, type Tone } from '@/components/portal/ui';
import { inputClass } from '@/components/portal/forms';
import { fmtDateTime } from '@/lib/portal/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Audit log' };
const PAGE = 50;

const GROUPS = ['auth', 'user', 'role', 'client', 'project', 'task', 'document', 'invoice', 'payment', 'ticket', 'meeting', 'change_request', 'lead', 'announcement', 'settings', 'google', 'leave'];

function tone(action: string): Tone {
  if (/failed|blocked|deactivated|deleted|cancelled|rejected/.test(action)) return 'red';
  if (/login|logout/.test(action)) return 'slate';
  if (/permission|role|settings|mfa|password/.test(action)) return 'violet';
  if (/payment|invoice/.test(action)) return 'green';
  return 'brand';
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<AuditFilters & { page?: string }> }) {
  await requirePermission('audit.view');
  const sp = await searchParams;
  const filters: AuditFilters = { action: sp.action, actor: sp.actor?.slice(0, 100), from: sp.from, to: sp.to, q: sp.q?.slice(0, 100) };
  const page = Math.max(1, Number(sp.page) || 1);
  const [rows, [{ n }]] = await Promise.all([auditRows(filters, PAGE, (page - 1) * PAGE), db.select({ n: count() }).from(auditLogs).where(auditWhere(filters))]);
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Audit log"
        description="Every sign-in, permission change, financial action, document access and approval — who, what, when and from where."
        actions={
          <a href={`/api/portal/audit/export?${qs}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand bg-white px-4 text-sm font-medium text-brand hover:bg-brand hover:text-white">
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
      />
      <Panel>
        <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <select name="action" defaultValue={filters.action ?? ''} className={cn(inputClass, 'py-2')} aria-label="Action">
            <option value="">All actions</option>
            {GROUPS.map((g) => (
              <option key={g} value={`${g}.`}>
                {g.replace('_', ' ')}
              </option>
            ))}
          </select>
          <input name="actor" defaultValue={filters.actor} placeholder="Actor email" className={cn(inputClass, 'py-2')} />
          <input name="q" defaultValue={filters.q} placeholder="Entity id / IP" className={cn(inputClass, 'py-2')} />
          <input name="from" type="date" defaultValue={filters.from} className={cn(inputClass, 'py-2')} aria-label="From" />
          <input name="to" type="date" defaultValue={filters.to} className={cn(inputClass, 'py-2')} aria-label="To" />
          <button className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f6ccd]">Filter</button>
        </form>
        {rows.length === 0 ? (
          <EmptyState icon={FileClock} title="No matching events" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Who</Th>
                <Th>What</Th>
                <Th>Record</Th>
                <Th>IP / device</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap text-xs text-slate-600">{fmtDateTime(r.createdAt)}</Td>
                  <Td className="text-xs">{r.actorEmail ?? <span className="text-slate-400">Anonymous / system</span>}</Td>
                  <Td>
                    <Badge tone={tone(r.action)}>{r.action}</Badge>
                    {Object.keys(r.metadata as object).length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] text-slate-400 hover:text-brand">details</summary>
                        <pre className="mt-1 max-w-sm overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[10.5px] text-slate-600">{JSON.stringify(r.metadata, null, 2)}</pre>
                      </details>
                    )}
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {r.entityType ?? '—'}
                    {r.entityId && <span className="block font-mono text-[10.5px] text-slate-400">{r.entityId.slice(0, 8)}…</span>}
                  </Td>
                  <Td className="text-xs text-slate-500">
                    <span className="font-mono">{r.ip ?? '—'}</span>
                    <span className="block">{deviceLabel(r.userAgent)}</span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE} total={n} hrefFor={(p) => `/portal/audit?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(p) })}`} />
      </Panel>
    </>
  );
}
