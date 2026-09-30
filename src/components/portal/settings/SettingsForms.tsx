'use client';

import { useState, useTransition } from 'react';
import { KeyRound, Mail, ShieldCheck, ShieldOff, Unplug, Video } from 'lucide-react';
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField, Toggle } from '../forms';
import {
  beginTotpSetupAction,
  changePasswordAction,
  confirmTotpAction,
  disableTotpAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
  saveRolePermissionsAction,
  saveSettingsSectionAction,
  sendTestEmailAction,
  updateProfileAction,
} from '@/server/actions/settings';
import { disconnectGoogleAction } from '@/server/actions/meetings';
import type { ActionState } from '@/server/actions/types';
import { GST_STATES } from '@/lib/portal/invoice-math';

export function ProfileForm({ user }: { user: { name: string; phone: string | null; title: string | null; emailNotifications: boolean; email: string } }) {
  return (
    <ActionForm action={updateProfileAction}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" name="name" required defaultValue={user.name} />
        <TextField label="Email" name="email_display" defaultValue={user.email} disabled hint="Contact an admin to change your sign-in email." />
        <TextField label="Job title" name="title" defaultValue={user.title ?? ''} />
        <TextField label="Phone" name="phone" defaultValue={user.phone ?? ''} />
      </div>
      <Toggle name="emailNotifications" label="Email me important notifications" description="High-priority items (new tasks, meetings, invoices) also arrive by email." defaultChecked={user.emailNotifications} />
      <div className="flex justify-end">
        <SubmitButton>Save profile</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction} resetOnSuccess>
      <TextField label="Current password" name="current" type="password" autoComplete="current-password" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="New password" name="password" type="password" autoComplete="new-password" required hint="At least 10 characters with a mix of letters, numbers or symbols." />
        <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      <div className="flex justify-end">
        <SubmitButton>
          <KeyRound className="h-4 w-4" /> Change password
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (enabled) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <ShieldCheck className="h-4 w-4" /> Two-step verification is on. You&rsquo;ll enter a code from your authenticator app when signing in.
        </p>
        <ActionForm action={disableTotpAction}>
          <TextField label="Confirm with your password to turn it off" name="password" type="password" required />
          <SubmitButton variant="secondary">
            <ShieldOff className="h-4 w-4" /> Turn off
          </SubmitButton>
        </ActionForm>
      </div>
    );
  }
  if (!setup) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Add a second step to sign-in using Google Authenticator, Microsoft Authenticator, 1Password or Authy.</p>
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await beginTotpSetupAction();
              if ('error' in r) setError(r.error);
              else setSetup({ secret: r.secret, qr: r.qr });
            })
          }
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-[#2f6ccd] disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" /> Set up two-step verification
        </button>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
      <div className="rounded-xl border border-gray-200 bg-white p-2" dangerouslySetInnerHTML={{ __html: setup.qr }} aria-label="QR code for your authenticator app" />
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Scan the QR code, or enter this key manually:</p>
        <code className="block break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm tracking-wider text-slate-800">{setup.secret.match(/.{1,4}/g)?.join(' ')}</code>
        <ActionForm action={confirmTotpAction}>
          <TextField label="Enter the 6-digit code to confirm" name="code" inputMode="numeric" maxLength={6} required />
          <SubmitButton>Verify & turn on</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}

export function SessionRevokeButton({ id, all }: { id?: string; all?: boolean }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button
      disabled={pending || done}
      onClick={() => start(async () => void ((all ? await revokeOtherSessionsAction() : await revokeSessionAction(id!)).ok && setDone(true)))}
      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
    >
      {done ? 'Signed out' : all ? 'Sign out all other devices' : 'Sign out'}
    </button>
  );
}

export function GoogleConnection({ email, configured }: { email: string | null; configured: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  if (!configured) {
    return <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">Google OAuth isn&rsquo;t configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (see docs/portal/SETUP.md).</p>;
  }
  if (email && !state.ok) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-slate-700">
          <Video className="h-4 w-4 text-brand" /> Connected as <span className="font-semibold">{email}</span>
        </p>
        <button disabled={pending} onClick={() => start(async () => setState(await disconnectGoogleAction()))} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600">
          <Unplug className="h-4 w-4" /> Disconnect
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">Connect your Google account to create Google Meet meetings directly from the portal. We only request permission to manage calendar events you create.</p>
      <a href="/api/portal/google/connect" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-[#2f6ccd]">
        <Video className="h-4 w-4" /> Connect Google Calendar
      </a>
    </div>
  );
}

export function SettingsSectionForm({ section, values, people }: { section: string; values: Record<string, unknown>; people?: { id: string; name: string }[] }) {
  const v = (k: string) => (values[k] === null || values[k] === undefined ? '' : String(values[k]));
  const b = (k: string) => Boolean(values[k]);
  return (
    <ActionForm action={saveSettingsSectionAction}>
      <input type="hidden" name="section" value={section} />
      {section === 'company' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {['name', 'legalName', 'email', 'phone', 'website', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country'].map((k) => (
            <TextField key={k} label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())} name={k} defaultValue={v(k)} />
          ))}
        </div>
      )}
      {section === 'tax' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="GSTIN" name="gstin" defaultValue={v('gstin')} hint="Printed on every invoice" />
          <TextField label="PAN" name="pan" defaultValue={v('pan')} />
          <SelectField label="Supplier state (GST)" name="stateCode" defaultValue={v('stateCode')} options={GST_STATES.map((s) => ({ value: s.code, label: `${s.code} · ${s.name}` }))} hint="Same state as client → CGST + SGST; otherwise IGST" />
          <TextField label="Default GST rate (%)" name="defaultTaxRatePct" type="number" defaultValue={v('defaultTaxRatePct')} />
          <TextField label="Default SAC code" name="sacCode" defaultValue={v('sacCode')} hint="998313 — IT consulting & support" />
        </div>
      )}
      {section === 'invoice' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Invoice number prefix" name="prefix" defaultValue={v('prefix')} hint="e.g. INV → INV-2026-0001" />
            <TextField label="Default payment window (days)" name="defaultDueDays" type="number" defaultValue={v('defaultDueDays')} />
            <TextField label="Bank name" name="bankName" defaultValue={v('bankName')} />
            <TextField label="Account name" name="bankAccountName" defaultValue={v('bankAccountName')} />
            <TextField label="Account number" name="bankAccountNumber" defaultValue={v('bankAccountNumber')} />
            <TextField label="IFSC" name="bankIfsc" defaultValue={v('bankIfsc')} />
            <TextField label="UPI ID" name="upiId" defaultValue={v('upiId')} />
          </div>
          <TextAreaField label="Default payment terms" name="defaultTerms" rows={2} defaultValue={v('defaultTerms')} />
          <TextAreaField label="Default notes" name="defaultNotes" rows={2} defaultValue={v('defaultNotes')} />
        </>
      )}
      {section === 'notifications' && (
        <>
          <Toggle name="soundEnabled" label="Play a sound for new important notifications" description="Users can still mute it on their own device." defaultChecked={b('soundEnabled')} />
          <Toggle name="emailHighPriority" label="Email high-priority notifications" defaultChecked={b('emailHighPriority')} />
          <TextField label="Check for new notifications every (seconds)" name="pollSeconds" type="number" min={10} max={300} defaultValue={v('pollSeconds')} />
        </>
      )}
      {section === 'leads' && (
        <>
          <SelectField label="Default salesperson" name="defaultAssigneeId" defaultValue={v('defaultAssigneeId')} placeholder="None — distribute automatically" options={(people ?? []).map((p) => ({ value: p.id, label: p.name }))} />
          <Toggle name="roundRobin" label="Balance new leads across the sales team" description="Assigns each new website lead to the lead manager with the fewest open leads." defaultChecked={b('roundRobin')} />
        </>
      )}
      {section === 'storage' && <TextField label="Maximum upload size (MB)" name="maxUploadMb" type="number" min={1} max={100} defaultValue={v('maxUploadMb')} />}
      {section === 'security' && <Toggle name="enforceMfaForInternal" label="Require two-step verification for team accounts" description="Team members can't turn 2FA off once this is on." defaultChecked={b('enforceMfaForInternal')} />}
      {section === 'branding' && (
        <>
          <TextField label="Portal name" name="portalName" defaultValue={v('portalName')} />
          <input type="hidden" name="accentHex" value="#3478e4" />
          <p className="text-xs text-slate-500">The portal uses the website&rsquo;s brand system (Isha blue #3478e4, DM Sans) so it stays consistent with ishatechnologies.in.</p>
        </>
      )}
      <div className="flex justify-end">
        <SubmitButton>Save</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function RolePermissionsForm({ role, label, granted, groups }: { role: string; label: string; granted: string[]; groups: { group: string; items: { key: string; label: string }[] }[] }) {
  return (
    <ActionForm action={saveRolePermissionsAction}>
      <input type="hidden" name="role" value={role} />
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <fieldset key={g.group} className="rounded-xl border border-gray-200 p-3">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-brand">{g.group}</legend>
            {g.items.map((p) => (
              <label key={p.key} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm text-slate-700 hover:bg-brand/5">
                <input type="checkbox" name="permissions" value={p.key} defaultChecked={granted.includes(p.key)} className="h-4 w-4 rounded accent-[#3478e4]" />
                {p.label}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="flex justify-end">
        <SubmitButton>Save {label} permissions</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function TestEmailButton() {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button disabled={pending} onClick={() => start(async () => setState(await sendTestEmailAction()))} className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand px-4 text-sm font-medium text-brand hover:bg-brand hover:text-white disabled:opacity-50">
        <Mail className="h-4 w-4" /> Send test email to me
      </button>
      {state.error && <span className="text-sm text-rose-600">{state.error}</span>}
      {state.message && <span className="text-sm text-emerald-700">{state.message}</span>}
    </div>
  );
}
