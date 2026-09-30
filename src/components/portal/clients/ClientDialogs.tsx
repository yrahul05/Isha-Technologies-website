'use client';

import { useState, useTransition } from 'react';
import { Copy, KeyRound, Pencil, Plus, UserPlus } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, SelectField, SubmitButton, TextField } from '../forms';
import { ClientForm } from './ClientForm';
import { createClientLoginAction, resendInviteAction, setUserActiveAction } from '@/server/actions/users';
import type { ActionState } from '@/server/actions/types';
import type { ComponentProps } from 'react';

export function NewClientButton({ managers }: { managers: { id: string; name: string }[] }) {
  return (
    <Modal trigger={<><Plus className="h-4 w-4" /> Add client</>} title="Add client" description="Creates an isolated client account. Add portal logins from the client's profile." wide>
      {(close) => <ClientForm managers={managers} onDone={close} />}
    </Modal>
  );
}

export function EditClientButton(props: { initial: ComponentProps<typeof ClientForm>['initial']; managers: { id: string; name: string }[] }) {
  return (
    <Modal trigger={<><Pencil className="h-4 w-4" /> Edit</>} triggerVariant="secondary" title="Edit client" wide>
      {(close) => <ClientForm {...props} onDone={close} />}
    </Modal>
  );
}

/** Shows a one-time activation link only when email delivery isn't configured. */
export function InviteLinkNotice({ state }: { state: ActionState }) {
  const [copied, setCopied] = useState(false);
  if (!state.data?.link) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
      <p className="font-semibold">One-time activation link (expires in 7 days)</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-1.5 font-mono text-[11px] text-slate-700">{state.data.link}</code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(state.data!.link!);
            setCopied(true);
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1.5 font-semibold text-brand ring-1 ring-brand/20"
        >
          <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export function AddClientLoginButton({ clientId }: { clientId: string }) {
  return (
    <Modal trigger={<><UserPlus className="h-4 w-4" /> Create login</>} title="Create client login" description="The person receives an invitation to set their own password. They will only ever see this client's data.">
      {() => (
        <ActionForm action={createClientLoginAction}>
          {(state) => (
            <>
              <input type="hidden" name="clientId" value={clientId} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Full name" name="name" required />
                <TextField label="Email" name="email" type="email" required />
                <TextField label="Job title" name="title" />
                <TextField label="Phone" name="phone" />
              </div>
              <SelectField
                label="Access level"
                name="role"
                defaultValue="member"
                options={[
                  { value: 'member', label: 'Member — sees account data and meetings they are invited to' },
                  { value: 'owner', label: 'Owner — also sees all of the account’s meetings' },
                ]}
              />
              <InviteLinkNotice state={state} />
              {!state.ok && (
                <div className="flex justify-end">
                  <SubmitButton>Create & send invite</SubmitButton>
                </div>
              )}
            </>
          )}
        </ActionForm>
      )}
    </Modal>
  );
}

export function UserAccessControls({ userId, isActive, canManage }: { userId: string; isActive: boolean; canManage: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  if (!canManage) return null;
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <button
          disabled={pending}
          onClick={() => start(async () => setState(await resendInviteAction(userId)))}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-brand hover:text-brand disabled:opacity-50"
        >
          <KeyRound className="h-3 w-3" /> Send reset link
        </button>
        <button
          disabled={pending}
          onClick={() => start(async () => setState(await setUserActiveAction(userId, !isActive)))}
          className={
            isActive
              ? 'rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50'
              : 'rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50'
          }
        >
          {isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
      {state.error && <p className="text-[11px] text-rose-600">{state.error}</p>}
      {state.ok && state.message && !state.data?.link && <p className="text-[11px] text-emerald-700">{state.message}</p>}
      {state.data?.link && (
        <div className="w-72">
          <InviteLinkNotice state={state} />
        </div>
      )}
    </div>
  );
}
