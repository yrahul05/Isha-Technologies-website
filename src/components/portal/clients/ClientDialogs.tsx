'use client';

import Link from 'next/link';
import { KeyRound, Pencil, Plus, UserPlus } from 'lucide-react';
import { Modal } from '../modal';
import { ClientForm } from './ClientForm';
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

/** Accounts are created by an administrator in User Management (no invitations or self-registration). */
export function AddClientLoginButton({ clientId }: { clientId: string }) {
  return (
    <Link href={`/portal/users/new?role=client&clientId=${clientId}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand bg-white px-3 text-sm font-medium text-brand hover:bg-brand hover:text-white">
      <UserPlus className="h-4 w-4" /> Create login
    </Link>
  );
}

/** Account controls (set/reset password, enable/disable, revoke sessions) live on the user's management page. */
export function UserAccessControls({ userId, canManage }: { userId: string; isActive?: boolean; canManage: boolean }) {
  if (!canManage) return null;
  return (
    <Link href={`/portal/users/${userId}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-brand hover:text-brand">
      <KeyRound className="h-3 w-3" /> Manage account
    </Link>
  );
}
