import type { Metadata } from 'next';
import Link from 'next/link';
import { and, desc, eq, gt, like } from 'drizzle-orm';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { db } from '@/server/db';
import { auditLogs, rolePermissions, sessions, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { getSetting, type SettingsMap } from '@/server/settings';
import { googleConnectionStatus, isGoogleConfigured, googleRedirectUri } from '@/server/google';
import { storageDriver, STORAGE_LABELS } from '@/server/storage';
import { scannerConfigured } from '@/server/scan';
import { internalPeople } from '@/server/queries/people';
import { deviceLabel } from '@/server/queries/audit';
import { PageHeader, Panel, Badge } from '@/components/portal/ui';
import { RolePermissionsForm, SessionRevokeButton, SettingsSectionForm, TestEmailButton, TwoFactorPanel } from '@/components/portal/settings/SettingsForms';
import { AvatarUploader, EmailChangeForm, GoogleConnection, NotificationPrefsForm, PasswordChangeForm, ProfileForm } from '@/components/portal/settings/AccountForms';
import { maskEmail } from '@/lib/portal/profile';
import { EDITABLE_ROLES, PERMISSIONS, ROLE_LABELS } from '@/lib/portal/permissions';
import { fmtDateTime, relativeTime } from '@/lib/portal/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Settings' };

const PERSONAL = [
  { key: 'account', label: 'My account' },
  { key: 'security', label: 'Sign-in & security' },
];
const ADMIN = [
  { key: 'company', label: 'Company' },
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles & permissions' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'invoice', label: 'Invoice settings' },
  { key: 'tax', label: 'Tax / GST' },
  { key: 'currencies', label: 'Currencies' },
  { key: 'payment', label: 'Payment details' },
  { key: 'google', label: 'Google Calendar' },
  { key: 'email', label: 'Email' },
  { key: 'storage', label: 'Storage' },
  { key: 'policy', label: 'Security policy' },
  { key: 'leads', label: 'Lead assignment' },
  { key: 'branding', label: 'Branding' },
  { key: 'system', label: 'System' },
];

const GOOGLE_MESSAGES: Record<string, string> = {
  connected: 'Google Calendar connected.',
  denied: 'Google access was not granted.',
  failed: 'Could not connect Google. Try again.',
  invalid_state: 'That Google sign-in link expired. Try again.',
  not_configured: 'Google OAuth is not configured on the server.',
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ section?: string; google?: string; mfa?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const admin = can(viewer, 'settings.manage');
  const sections = [...PERSONAL, ...(viewer.isInternal && !admin ? [{ key: 'google', label: 'Google Calendar' }] : []), ...(admin ? ADMIN : [])];
  const section = sections.find((s) => s.key === sp.section)?.key ?? 'account';
  const [user] = await db.select().from(users).where(eq(users.id, viewer.id));

  return (
    <>
      <PageHeader eyebrow="Settings" title="Settings" description={admin ? 'Your account, and how the portal runs for everyone.' : 'Your profile, password and sign-in security.'} />
      {sp.google && GOOGLE_MESSAGES[sp.google] && (
        <p className={cn('mb-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm', sp.google === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800')}>
          {sp.google === 'connected' ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />} {GOOGLE_MESSAGES[sp.google]}
        </p>
      )}
      {sp.mfa === 'required' && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <CircleAlert className="h-4 w-4" /> Your organisation requires two-step verification for team accounts. Set it up below to continue.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {PERSONAL.map((s) => (
            <SectionLink key={s.key} s={s} active={section === s.key} />
          ))}
          {viewer.isInternal && !admin && <SectionLink s={{ key: 'google', label: 'Google Calendar' }} active={section === 'google'} />}
          {admin && <p className="mt-4 hidden px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:block">Administration</p>}
          {admin && ADMIN.map((s) => <SectionLink key={s.key} s={s} active={section === s.key} />)}
        </nav>
        <div className="min-w-0 space-y-6">
          {section === 'account' && (
            <>
              <Panel title="Profile photo">
                <AvatarUploader name={user.name} src={viewer.avatarUrl} />
              </Panel>
              <Panel title="Profile">
                <ProfileForm
                  user={{ name: user.name, phone: user.phone, title: user.title, emailNotifications: user.emailNotifications, email: user.email, timezone: user.timezone, roleLabel: ROLE_LABELS[viewer.role], company: viewer.clientName }}
                />
              </Panel>
              <Panel title="Notification preferences" description="Choose what you hear about, in the portal and by email. Security alerts are always sent.">
                <NotificationPrefsForm prefs={(user.notificationPrefs ?? {}) as Record<string, boolean>} />
              </Panel>
            </>
          )}
          {section === 'security' && (
            <>
              <Panel title="Change password" description="We email a verification code to your registered address first. Your other devices are signed out afterwards.">
                <PasswordChangeForm maskedEmail={maskEmail(user.email)} />
              </Panel>
              <Panel title="Sign-in email" description="Changing your email requires your password and a code sent to the new address.">
                <EmailChangeForm email={user.email} />
              </Panel>
              <SecuritySection viewerId={viewer.id} sessionId={viewer.sessionId} totp={user.totpEnabled} />
            </>
          )}
          {section === 'google' && viewer.isInternal && (
            <Panel title="Google Calendar & Meet" description="Per-user connection. Meetings you schedule are created on your own Google Calendar.">
              <GoogleConnection status={isGoogleConfigured() ? await googleConnectionStatus(viewer.id) : { state: 'not_connected' }} configured={isGoogleConfigured()} />
              {admin && (
                <p className="mt-4 text-xs text-slate-500">
                  Authorised redirect URI to register in Google Cloud Console: <code className="rounded bg-slate-50 px-1.5 py-0.5 font-mono">{googleRedirectUri()}</code>
                </p>
              )}
            </Panel>
          )}
          {admin && ['company', 'tax', 'invoice', 'currencies', 'payment', 'notifications', 'leads', 'storage', 'branding'].includes(section) && <AdminSection section={section as keyof SettingsMap} viewer={viewer} />}
          {admin && section === 'policy' && (
            <Panel title="Security policy">
              <SettingsSectionForm section="security" values={await getSetting('security')} />
              <ul className="mt-5 space-y-1.5 border-t border-gray-100 pt-4 text-sm text-slate-600">
                <li>• Sessions last until midnight IST (minimum 3 hours) and are stored server-side; sign-out and deactivation revoke them instantly.</li>
                <li>• 5 failed sign-ins lock an account for 15 minutes; 25 from one IP lock that IP.</li>
                <li>• Passwords are hashed with scrypt. Resets and password changes need a 6-digit emailed code (hashed, single-use, 10 minutes, 5 attempts, resend cooldown and lockout).</li>
              </ul>
            </Panel>
          )}
          {admin && section === 'roles' && <RolesSection superAdmin={viewer.isSuperAdmin} />}
          {admin && section === 'users' && (
            <Panel title="Users">
              <p className="text-sm text-slate-600">People are managed where they work:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/portal/team" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand">
                  Team members →
                </Link>
                <Link href="/portal/clients" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand">
                  Client logins (per client) →
                </Link>
              </div>
            </Panel>
          )}
          {admin && section === 'email' && (
            <Panel title="Email delivery" description="Transactional email via Resend (same provider as the website contact form).">
              <StatusRow ok={Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM)} label="EMAIL_API_KEY and EMAIL_FROM" />
              <div className="mt-4">
                <TestEmailButton />
              </div>
            </Panel>
          )}
          {admin && section === 'system' && (
            <Panel title="System status" description="Configuration detected on this deployment (values are never shown).">
              <div className="space-y-2">
                <StatusRow ok={Boolean(process.env.DATABASE_URL)} label={process.env.DATABASE_URL ? 'Database: PostgreSQL (DATABASE_URL)' : 'Database: embedded PGlite (development only)'} />
                <StatusRow ok={storageDriver() !== 'local' || process.env.NODE_ENV !== 'production'} label={`File storage: ${STORAGE_LABELS[storageDriver()]}`} />
                <StatusRow ok={scannerConfigured()} label={scannerConfigured() ? 'Malware scanning: ClamAV (CLAMAV_HOST)' : 'Malware scanning: not configured (type, size and signature checks still apply)'} />
                <StatusRow ok={false} label="Backups: not verified from the app — see docs/portal/BACKUP_AND_RECOVERY.md" />
                <StatusRow ok={Boolean(process.env.ENCRYPTION_KEY)} label="ENCRYPTION_KEY (Google tokens, 2FA secrets)" />
                <StatusRow ok={isGoogleConfigured()} label="Google OAuth (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)" />
                <StatusRow ok={Boolean(process.env.EMAIL_API_KEY)} label="Email provider" />
                <StatusRow ok={Boolean(process.env.CRON_SECRET)} label="CRON_SECRET (daily reminders & overdue invoices)" />
                <StatusRow ok={Boolean(process.env.APP_URL)} label="APP_URL (links in emails and OAuth)" />
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function SectionLink({ s, active }: { s: { key: string; label: string }; active: boolean }) {
  return (
    <Link href={`/portal/settings?section=${s.key}`} className={cn('whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium', active ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
      {s.label}
    </Link>
  );
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <p className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-amber-500" />}
      <span className={ok ? 'text-slate-700' : 'text-slate-500'}>{label}</span>
    </p>
  );
}

async function SecuritySection({ viewerId, sessionId, totp }: { viewerId: string; sessionId: string; totp: boolean }) {
  const [active, logins] = await Promise.all([
    db.select().from(sessions).where(and(eq(sessions.userId, viewerId), gt(sessions.expiresAt, new Date()))).orderBy(desc(sessions.lastSeenAt)),
    db.select().from(auditLogs).where(and(eq(auditLogs.actorId, viewerId), like(auditLogs.action, 'auth.%'))).orderBy(desc(auditLogs.createdAt)).limit(15),
  ]);
  return (
    <>
      <Panel title="Two-step verification">
        <TwoFactorPanel enabled={totp} />
      </Panel>
      <Panel title="Active sessions" description="Each sign-in lasts until midnight IST." action={active.length > 1 ? <SessionRevokeButton all /> : null}>
        <ul className="divide-y divide-gray-100">
          {active.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  {deviceLabel(s.userAgent)} {s.id === sessionId && <Badge tone="green">This device</Badge>}
                </span>
                <span className="text-xs text-slate-500">
                  {s.ip} · signed in {fmtDateTime(s.createdAt)} · active {relativeTime(s.lastSeenAt)}
                </span>
              </span>
              {s.id !== sessionId && <SessionRevokeButton id={s.id} />}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Recent sign-in activity">
        <ul className="space-y-1.5 text-sm">
          {logins.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2">
              <Badge tone={l.action.includes('failed') || l.action.includes('blocked') ? 'red' : 'slate'}>{l.action.replace('auth.', '').replace('_', ' ')}</Badge>
              <span className="text-slate-600">{fmtDateTime(l.createdAt)}</span>
              <span className="text-xs text-slate-400">
                {l.ip} · {deviceLabel(l.userAgent)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

async function AdminSection({ section, viewer }: { section: keyof SettingsMap; viewer: Awaited<ReturnType<typeof requireViewer>> }) {
  const values = (await getSetting(section)) as unknown as Record<string, unknown>;
  const titles: Partial<Record<keyof SettingsMap, [string, string]>> = {
    company: ['Company', 'Appears on invoices and emails.'],
    tax: ['Tax / GST', 'GST for INR invoices and the default tax for international invoices. Nothing is hard-coded.'],
    invoice: ['Invoice settings', 'Numbering, default currency, terms, footer and signatory.'],
    currencies: ['Currencies', 'INR (default), USD and CAD. Codes are fixed; symbols can be adjusted.'],
    payment: ['Payment details', 'Bank details printed on invoices. Choose exactly which fields are shown.'],
    notifications: ['Notifications', 'Defaults for every portal user.'],
    leads: ['Lead assignment', 'How new website leads are routed.'],
    storage: ['Storage', `Provider: ${STORAGE_LABELS[storageDriver()]} · files are private and served only after an access check.`],
    branding: ['Branding', 'The portal inherits the Isha Technologies website design system.'],
  };
  const [title, description] = titles[section] ?? [section, ''];
  const people = section === 'leads' ? await internalPeople(viewer) : undefined;
  return (
    <Panel title={title} description={description}>
      <SettingsSectionForm section={section} values={values} people={people} />
    </Panel>
  );
}

async function RolesSection({ superAdmin }: { superAdmin: boolean }) {
  const grants = await db.select().from(rolePermissions);
  const groups = [...new Set(PERMISSIONS.map((p) => p.group))].map((group) => ({ group, items: PERMISSIONS.filter((p) => p.group === group).map((p) => ({ key: p.key, label: p.label })) }));
  return (
    <>
      <Panel title="How access works">
        <ul className="space-y-1.5 text-sm text-slate-600">
          <li>
            • <strong>Super Admin</strong> always has every permission.
          </li>
          <li>
            • <strong>Clients</strong> only ever see their own account — enforced in every database query, independent of this matrix.
          </li>
          <li>
            • <strong>Team members</strong> see projects, tasks and documents they are assigned to, plus whatever you grant below.
          </li>
        </ul>
      </Panel>
      {EDITABLE_ROLES.map((role) => (
        <Panel key={role} title={ROLE_LABELS[role]} description={superAdmin ? 'Changes apply on each user’s next page load.' : 'Only a Super Admin can edit role permissions.'}>
          {superAdmin ? (
            <RolePermissionsForm role={role} label={ROLE_LABELS[role]} granted={grants.filter((g) => g.role === role).map((g) => g.permission)} groups={groups} />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {grants
                .filter((g) => g.role === role)
                .map((g) => (
                  <Badge key={g.permission} tone="slate">
                    {PERMISSIONS.find((p) => p.key === g.permission)?.label ?? g.permission}
                  </Badge>
                ))}
            </div>
          )}
        </Panel>
      ))}
    </>
  );
}
