'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, KeyRound, Lock, Mail, RefreshCw, Trash2, Unplug, Video } from 'lucide-react';
import { ActionForm, SelectField, SubmitButton, TextField, Toggle } from '../forms';
import { Avatar } from '../ui';
import { changePasswordAction, confirmEmailChangeAction, requestEmailChangeAction, requestPasswordChangeCodeAction, saveNotificationPrefsAction, updateProfileAction } from '@/server/actions/settings';
import { disconnectGoogleAction } from '@/server/actions/meetings';
import type { ActionState } from '@/server/actions/types';
import { TIMEZONES } from '@/lib/portal/profile';
import { PREFERENCE_CATEGORIES } from '@/lib/portal/notification-prefs';

export function ProfileForm({ user }: { user: { name: string; phone: string | null; title: string | null; emailNotifications: boolean; email: string; timezone: string; roleLabel: string; company: string | null } }) {
  return (
    <ActionForm action={updateProfileAction}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" name="name" required defaultValue={user.name} />
        <TextField label="Job title" name="title" defaultValue={user.title ?? ''} />
        <TextField label="Phone" name="phone" defaultValue={user.phone ?? ''} />
        <SelectField label="Timezone" name="timezone" defaultValue={user.timezone} options={TIMEZONES} hint="Used for dates in the portal and in meeting emails." />
        <TextField label="Role" name="role_display" defaultValue={user.roleLabel} disabled hint="Roles are managed by your administrator." />
        <TextField label="Company" name="company_display" defaultValue={user.company ?? 'Isha Technologies'} disabled />
      </div>
      <Toggle name="emailNotifications" label="Email me important notifications" description="High-priority items also arrive by email (per-category choices below)." defaultChecked={user.emailNotifications} />
      <div className="flex justify-end">
        <SubmitButton>Save profile</SubmitButton>
      </div>
    </ActionForm>
  );
}

/** Profile photo: PNG/JPG/WebP ≤ 2 MB, stored privately and only shown to people who can see you. */
export function AvatarUploader({ name, src }: { name: string; src: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const send = (method: 'POST' | 'DELETE', file?: File) =>
    start(async () => {
      setError(null);
      const body = file ? new FormData() : undefined;
      if (file && body) body.append('file', file);
      const res = await fetch('/api/portal/avatar', { method, body });
      if (!res.ok) setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Upload failed.');
      router.refresh();
      if (input.current) input.current.value = '';
    });
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar name={name} src={src} size="lg" />
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && send('POST', e.target.files[0])} />
          <button type="button" disabled={pending} onClick={() => input.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand disabled:opacity-50">
            <Camera className="h-4 w-4" /> {src ? 'Change photo' : 'Upload photo'}
          </button>
          {src && (
            <button type="button" disabled={pending} onClick={() => send('DELETE')} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-500 hover:text-rose-600 disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">PNG, JPG or WebP, up to 2 MB.</p>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </div>
    </div>
  );
}

/**
 * Password change: a code is emailed to the registered address first, so a
 * hijacked session alone can't change the password. Other devices are
 * signed out afterwards.
 */
export function PasswordChangeForm({ maskedEmail }: { maskedEmail: string }) {
  const [sent, setSent] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const sendCode = () => start(async () => setSent(await requestPasswordChangeCodeAction()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} onClick={sendCode} className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand px-4 text-sm font-medium text-brand hover:bg-brand hover:text-white disabled:opacity-50">
          <Mail className="h-4 w-4" /> {sent?.ok ? 'Resend code' : `Email a verification code to ${maskedEmail}`}
        </button>
        {sent?.error && <span className="text-sm text-rose-600">{sent.error}</span>}
        {sent?.ok && <span className="text-sm text-emerald-700">{sent.message}</span>}
      </div>
      {sent?.ok && (
        <ActionForm action={changePasswordAction} resetOnSuccess onSuccess={() => setSent(null)}>
          <TextField label="Verification code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required hint="6 digits, valid for 10 minutes." />
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
      )}
    </div>
  );
}

/** Email change: password re-check, then a code sent to the NEW address proves ownership. */
export function EmailChangeForm({ email }: { email: string }) {
  const [step, setStep] = useState<'start' | 'confirm' | 'done'>('start');
  if (step === 'done') return <p className="text-sm text-emerald-700">Your sign-in email was updated. We’ve notified your previous address.</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Current email: <span className="font-semibold text-slate-900">{email}</span>
      </p>
      {step === 'start' ? (
        <ActionForm action={requestEmailChangeAction} onSuccess={() => setStep('confirm')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="New email" name="newEmail" type="email" autoComplete="email" required />
            <TextField label="Current password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <div className="flex justify-end">
            <SubmitButton variant="secondary">Send code to new email</SubmitButton>
          </div>
        </ActionForm>
      ) : (
        <ActionForm action={confirmEmailChangeAction} onSuccess={() => setStep('done')}>
          <TextField label="Code sent to your new email" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
          <div className="flex justify-between gap-2">
            <button type="button" onClick={() => setStep('start')} className="text-sm font-semibold text-slate-500 hover:text-slate-900">
              Use a different email
            </button>
            <SubmitButton>Confirm new email</SubmitButton>
          </div>
        </ActionForm>
      )}
    </div>
  );
}

export function NotificationPrefsForm({ prefs }: { prefs: Record<string, boolean> }) {
  return (
    <ActionForm action={saveNotificationPrefsAction}>
      <div className="space-y-2">
        {PREFERENCE_CATEGORIES.map((c) =>
          c.locked ? (
            <div key={c.key} className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3">
              <span>
                <span className="block text-sm font-medium text-slate-800">{c.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{c.description}</span>
              </span>
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-label="Always on" />
            </div>
          ) : (
            <Toggle key={c.key} name={`pref_${c.key}`} label={c.label} description={c.description} defaultChecked={prefs[c.key] !== false} />
          ),
        )}
      </div>
      <div className="flex justify-end">
        <SubmitButton>Save preferences</SubmitButton>
      </div>
    </ActionForm>
  );
}

/** Per-user Google Calendar connection with live OAuth health. */
export function GoogleConnection({ status, configured }: { status: { state: 'not_connected' | 'connected' | 'reconnect'; email?: string; detail?: string }; configured: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  if (!configured) {
    return <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">Google OAuth isn&rsquo;t configured on this deployment. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (see docs/portal/SETUP.md).</p>;
  }
  const disconnect = (
    <button disabled={pending} onClick={() => start(async () => setState(await disconnectGoogleAction()))} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600">
      <Unplug className="h-4 w-4" /> Disconnect
    </button>
  );
  if (status.state !== 'not_connected' && !state.ok) {
    const healthy = status.state === 'connected';
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-slate-700">
            <Video className="h-4 w-4 text-brand" /> {healthy ? 'Connected' : 'Connection needs attention'} · <span className="font-semibold">{status.email}</span>
          </p>
          <div className="flex gap-2">
            <a href="/api/portal/google/connect" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand hover:text-brand">
              <RefreshCw className="h-4 w-4" /> Reconnect
            </a>
            {disconnect}
          </div>
        </div>
        <p className={healthy ? 'text-xs text-emerald-700' : 'rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'}>
          {healthy ? 'Google accepted a token refresh just now — Meet links can be created.' : 'Google no longer accepts this connection (access may have been revoked). Reconnect to keep creating Google Meet links.'}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">Connect your Google account to create Google Meet meetings directly from the portal. We only request permission to manage calendar events you create.</p>
      <a href="/api/portal/google/connect" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-[#2f6ccd]">
        <Video className="h-4 w-4" /> Connect Google Calendar
      </a>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
    </div>
  );
}
