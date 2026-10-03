'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { KeyRound, LogOut, ShieldAlert, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { ActionForm, SelectField, SubmitButton, TextField, Toggle } from '../forms';
import {
  createUserAction,
  revokeAccountSessionsAction,
  setAccountEnabledAction,
  setForcePasswordChangeAction,
  setUserPasswordAction,
  updateAccountAction,
} from '@/server/actions/user-admin';
import type { ActionState } from '@/server/actions/types';

const PASSWORD_HINT = 'At least 10 characters with a mix of letters, numbers or symbols.';

export function CreateUserForm({
  canCreateAdmin,
  clients,
  defaultRole,
  defaultClientId,
}: {
  canCreateAdmin: boolean;
  clients: { id: string; name: string }[];
  defaultRole: 'employee' | 'client' | 'admin';
  defaultClientId?: string;
}) {
  const [role, setRole] = useState<string>(defaultRole);
  return (
    <ActionForm action={createUserAction}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" name="name" required autoComplete="off" />
        <TextField label="Username" name="username" required autoComplete="off" hint="3-32 characters: letters, numbers, dot, dash, underscore." />
        <TextField label="Email" name="email" type="email" required autoComplete="off" />
        <TextField label="Phone" name="phone" autoComplete="off" />
        <SelectField
          label="Role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[
            { value: 'employee', label: 'Employee - sees only assigned work' },
            { value: 'client', label: 'Client - sees only their own company' },
            ...(canCreateAdmin ? [{ value: 'admin', label: 'Admin - manages accounts and operations' }] : []),
          ]}
        />
        {role === 'client' ? (
          <SelectField label="Company" name="clientId" defaultValue={defaultClientId ?? ''} placeholder="Choose a client company" options={clients.map((c) => ({ value: c.id, label: c.name }))} />
        ) : (
          <TextField label="Company" name="company_display" value="Isha Technologies" disabled readOnly />
        )}
        <SelectField
          label="Status"
          name="status"
          defaultValue="active"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'disabled', label: 'Disabled - cannot sign in yet' },
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Initial password" name="password" type="password" autoComplete="new-password" required hint={PASSWORD_HINT} />
        <TextField label="Confirm initial password" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      <Toggle name="forceChange" label="Force password change on next login" description="Recommended: the person chooses their own password before using the portal. You share the initial password with them yourself; it is never stored or shown again." defaultChecked />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Creating...">Create account</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function EditAccountForm({ user }: { user: { id: string; name: string; username: string | null; email: string; phone: string | null } }) {
  return (
    <ActionForm action={updateAccountAction}>
      <input type="hidden" name="userId" value={user.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" name="name" required defaultValue={user.name} />
        <TextField label="Username" name="username" required defaultValue={user.username ?? ''} />
        <TextField label="Email" name="email" type="email" required defaultValue={user.email} hint="Changing the username or email signs the user out everywhere." />
        <TextField label="Phone" name="phone" defaultValue={user.phone ?? ''} />
      </div>
      <div className="flex justify-end">
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </ActionForm>
  );
}

/** Set or reset: the admin types a NEW password. The current one is never shown or retrievable. */
export function ResetPasswordForm({ userId }: { userId: string }) {
  return (
    <ActionForm action={setUserPasswordAction} resetOnSuccess>
      <input type="hidden" name="userId" value={userId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="New password" name="password" type="password" autoComplete="new-password" required hint={PASSWORD_HINT} />
        <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      <Toggle name="forceChange" label="Force password change on next login" description="The user must replace this password with their own before using the portal." defaultChecked />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Setting...">
          <KeyRound className="h-4 w-4" /> Reset password
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

type ControlAction = (prev: ActionState, form: FormData) => Promise<ActionState>;

function MiniSubmit({ children, className }: { children: ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {children}
    </button>
  );
}

/** One control = one real server-action form (works with or without JavaScript). */
function ControlForm({ action, userId, value, children, className }: { action: ControlAction; userId: string; value?: '1' | '0'; children: ReactNode; className: string }) {
  return (
    <ActionForm action={action} className="space-y-1">
      <input type="hidden" name="userId" value={userId} />
      {value && <input type="hidden" name="value" value={value} />}
      <MiniSubmit className={className}>{children}</MiniSubmit>
    </ActionForm>
  );
}

const btn = 'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium disabled:opacity-50';
const neutral = `${btn} border-gray-200 text-slate-700 hover:border-brand hover:text-brand`;

/** Detail-page controls: force change, enable/disable, revoke sessions. */
export function AccountControls({ userId, isActive, force, isSelf }: { userId: string; isActive: boolean; force: boolean; isSelf: boolean }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <ControlForm action={setForcePasswordChangeAction} userId={userId} value={force ? '0' : '1'} className={neutral}>
        <ShieldAlert className="h-4 w-4" /> {force ? 'Turn off forced password change' : 'Force password change'}
      </ControlForm>
      <ControlForm action={revokeAccountSessionsAction} userId={userId} className={neutral}>
        <LogOut className="h-4 w-4" /> Revoke sessions
      </ControlForm>
      {!isSelf && (
        <ControlForm
          action={setAccountEnabledAction}
          userId={userId}
          value={isActive ? '0' : '1'}
          className={isActive ? `${btn} border-rose-200 text-rose-600 hover:bg-rose-50` : `${btn} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
        >
          {isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />} {isActive ? 'Disable account' : 'Enable account'}
        </ControlForm>
      )}
    </div>
  );
}

/** Compact actions for the user list. */
export function UserRowActions({ userId, isActive, force, canManage }: { userId: string; isActive: boolean; force: boolean; canManage: boolean }) {
  const small = 'rounded-lg border px-2 py-1 text-[11px] font-semibold disabled:opacity-50';
  const neutralSmall = `${small} border-gray-200 text-slate-600 hover:border-brand hover:text-brand`;
  return (
    <div className="flex min-w-[16rem] flex-wrap items-start gap-1.5">
      <Link href={`/portal/users/${userId}`} className={neutralSmall}>
        Edit
      </Link>
      {canManage && (
        <>
          <Link href={`/portal/users/${userId}#password`} className={neutralSmall}>
            Reset password
          </Link>
          <ControlForm action={setForcePasswordChangeAction} userId={userId} value={force ? '0' : '1'} className={neutralSmall}>
            {force ? 'Unforce change' : 'Force change'}
          </ControlForm>
          <ControlForm action={revokeAccountSessionsAction} userId={userId} className={neutralSmall}>
            Revoke sessions
          </ControlForm>
          <ControlForm
            action={setAccountEnabledAction}
            userId={userId}
            value={isActive ? '0' : '1'}
            className={isActive ? `${small} border-rose-200 text-rose-600 hover:bg-rose-50` : `${small} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
          >
            {isActive ? 'Disable' : 'Enable'}
          </ControlForm>
        </>
      )}
      <Link href={`/portal/users/${userId}#activity`} className={neutralSmall}>
        <ShieldCheck className="mr-1 inline h-3 w-3" />
        Security activity
      </Link>
    </div>
  );
}
