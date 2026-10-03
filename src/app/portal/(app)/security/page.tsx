import type { Metadata } from 'next';
import Link from 'next/link';
import { and, count, desc, eq, gt, inArray, like, or } from 'drizzle-orm';
import { KeyRound, LogIn, MonitorSmartphone, ShieldAlert, ShieldCheck } from 'lucide-react';
import { db } from '@/server/db';
import { auditLogs, sessions, users } from '@/server/db/schema';
import { requirePermission } from '@/server/auth/viewer';
import { deviceLabel } from '@/server/queries/audit';
import { Badge, EmptyState, PageHeader, Panel, StatCard, Table, Td, Th, Tr, type Tone } from '@/components/portal/ui';
import { RevokeSessionButton } from '@/components/portal/security/SessionControls';
import { ROLE_LABELS } from '@/lib/portal/permissions';
import { fmtDateTime, relativeTime } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Security' };

const ACCOUNT_EVENTS = [
  'auth.password_changed',
  'auth.password_reset',
  'auth.password_reset_requested',
  'auth.mfa_enabled',
  'auth.mfa_disabled',
  'user.email_changed',
  'user.role_changed',
  'user.activated',
  'user.deactivated',
  'user.created',
  'role.permissions_changed',
];

const EVENT_LABELS: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.login_failed': 'Failed sign-in',
  'auth.login_blocked': 'Blocked (lockout / rate limit)',
  'auth.password_changed': 'Password changed',
  'auth.password_reset': 'Password reset',
  'auth.password_reset_requested': 'Reset code requested',
  'auth.mfa_enabled': '2FA turned on',
  'auth.mfa_disabled': '2FA turned off',
  'user.email_changed': 'Email changed',
  'user.role_changed': 'Role changed',
  'user.activated': 'Account activated',
  'user.deactivated': 'Account deactivated',
  'user.created': 'Account created',
  'role.permissions_changed': 'Role permissions changed',
  'security.session_revoked': 'Sessions revoked by admin',
};

function tone(action: string): Tone {
  if (/failed|blocked|deactivated|disabled|revoked/.test(action)) return 'red';
  if (/password|mfa|email|role|permission/.test(action)) return 'violet';
  return 'slate';
}

/**
 * Super Admin security overview: who is signed in where, sign-in successes
 * and failures, and every sensitive account change — with session
 * revocation. Requires `security.manage` (Super Admin by default).
 */
export default async function SecurityPage() {
  const viewer = await requirePermission('security.manage');
  const now = new Date();
  const day = new Date(now.getTime() - 24 * 3600 * 1000);
  const month = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  const cols = { id: auditLogs.id, action: auditLogs.action, createdAt: auditLogs.createdAt, ip: auditLogs.ip, userAgent: auditLogs.userAgent, actorEmail: auditLogs.actorEmail, metadata: auditLogs.metadata, name: users.name };
  const events = () => db.select(cols).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId));
  const countOf = (actions: string[], since: Date) => db.select({ n: count() }).from(auditLogs).where(and(inArray(auditLogs.action, actions), gt(auditLogs.createdAt, since)));

  const [active, logins, failures, changes, [logins24], [failed24], [blocked24], [pwd30]] = await Promise.all([
    db
      .select({ s: sessions, name: users.name, email: users.email, role: users.role })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(gt(sessions.expiresAt, now))
      .orderBy(desc(sessions.lastSeenAt))
      .limit(200),
    events().where(eq(auditLogs.action, 'auth.login')).orderBy(desc(auditLogs.createdAt)).limit(25),
    events().where(inArray(auditLogs.action, ['auth.login_failed', 'auth.login_blocked'])).orderBy(desc(auditLogs.createdAt)).limit(25),
    events().where(or(inArray(auditLogs.action, ACCOUNT_EVENTS), like(auditLogs.action, 'security.%'))).orderBy(desc(auditLogs.createdAt)).limit(30),
    countOf(['auth.login'], day),
    countOf(['auth.login_failed'], day),
    countOf(['auth.login_blocked'], day),
    countOf(['auth.password_changed', 'auth.password_reset'], month),
  ]);
  const people = new Set(active.map((a) => a.s.userId)).size;

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Security"
        description="Active sessions, sign-in activity and sensitive account changes across the portal."
        actions={
          <Link href="/portal/audit?action=auth" className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand">
            Full audit log →
          </Link>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active sessions" value={active.length} hint={`${people} ${people === 1 ? 'person' : 'people'} signed in`} icon={MonitorSmartphone} />
        <StatCard label="Sign-ins (24 h)" value={logins24.n} icon={LogIn} tone="green" />
        <StatCard label="Failed sign-ins (24 h)" value={failed24.n} hint={blocked24.n ? `${blocked24.n} blocked by lockout / rate limit` : 'No lockouts'} icon={ShieldAlert} tone={failed24.n || blocked24.n ? 'red' : 'slate'} />
        <StatCard label="Password changes (30 d)" value={pwd30.n} icon={KeyRound} tone="violet" />
      </div>

      <Panel className="mb-6" title="Active sessions" description="Every signed-in device. Signing someone out takes effect on their next request.">
        {active.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No active sessions" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Device</Th>
                <Th>Signed in</Th>
                <Th>Last active</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {active.map(({ s, name, email, role }) => {
                const own = s.id === viewer.sessionId;
                const locked = role === 'super_admin' && !viewer.isSuperAdmin;
                return (
                  <Tr key={s.id}>
                    <Td>
                      <span className="block font-medium text-slate-900">
                        {name} {own && <Badge tone="green">You · this device</Badge>}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {email} · {ROLE_LABELS[role]}
                      </span>
                    </Td>
                    <Td>
                      <span className="block text-slate-800">{deviceLabel(s.userAgent)}</span>
                      <span className="block text-xs text-slate-500">{s.ip ?? '—'}</span>
                    </Td>
                    <Td>{fmtDateTime(s.createdAt)}</Td>
                    <Td>{relativeTime(s.lastSeenAt)}</Td>
                    <Td>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {!own && !locked && <RevokeSessionButton sessionId={s.id} userName={name} />}
                        {!locked && <RevokeSessionButton userId={s.userId} userName={name} />}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <EventPanel title="Failed sign-ins" description="Wrong passwords, unknown accounts and rate-limit blocks." rows={failures} empty="No failed sign-ins recorded." />
        <EventPanel title="Recent sign-ins" rows={logins} empty="No sign-ins yet." />
      </div>
      <div className="mt-6">
        <EventPanel
          title="Password, security & account changes"
          description="Password changes and resets, 2FA, email and role changes, permission edits and admin session revocations."
          rows={changes}
          empty="No account changes yet."
        />
      </div>
    </>
  );
}

type EventRow = { id: string; action: string; createdAt: Date; ip: string | null; userAgent: string | null; actorEmail: string | null; metadata: unknown; name: string | null };

function EventPanel({ title, description, rows, empty }: { title: string; description?: string; rows: EventRow[]; empty: string }) {
  return (
    <Panel title={title} description={description}>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((r) => {
            const meta = (r.metadata ?? {}) as Record<string, unknown>;
            const who = r.name ?? r.actorEmail ?? (typeof meta.identifier === 'string' ? meta.identifier : 'Unknown account');
            return (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge tone={tone(r.action)}>{EVENT_LABELS[r.action] ?? r.action}</Badge>
                    <span className="truncate font-medium text-slate-800">{who}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {r.ip ?? '—'} · {deviceLabel(r.userAgent)}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">{fmtDateTime(r.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
