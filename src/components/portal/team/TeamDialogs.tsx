'use client';

import Link from 'next/link';
import { Pencil, UserPlus } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, SelectField, SubmitButton, TextField } from '../forms';
import { updateTeamMemberAction } from '@/server/actions/users';

/** Accounts are created by an administrator in User Management (no invitations or self-registration). */
export function InviteTeamMemberButton({ canCreateAdmin }: { canCreateAdmin: boolean }) {
  void canCreateAdmin;
  return (
    <Link href="/portal/users/new?role=employee" className="inline-flex h-10 items-center gap-2 rounded-md border border-brand bg-brand px-4 text-sm font-medium text-white hover:bg-white hover:text-brand">
      <UserPlus className="h-4 w-4" /> Add team member
    </Link>
  );
}

export function EditTeamMemberButton({
  member,
  canChangeRole,
}: {
  member: { id: string; name: string; title: string | null; phone: string | null; role: string; department: string | null; weeklyCapacityHours: number; skills: string[]; availability: string };
  canChangeRole: boolean;
}) {
  return (
    <Modal trigger={<><Pencil className="h-4 w-4" /> Edit</>} triggerVariant="secondary" title={`Edit ${member.name}`} wide>
      {(close) => (
        <ActionForm action={updateTeamMemberAction} onSuccess={close}>
          <input type="hidden" name="id" value={member.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" name="name" required defaultValue={member.name} />
            <TextField label="Designation" name="title" defaultValue={member.title ?? ''} />
            <TextField label="Department" name="department" defaultValue={member.department ?? ''} />
            <TextField label="Phone" name="phone" defaultValue={member.phone ?? ''} />
            <TextField label="Weekly capacity (hours)" name="weeklyCapacityHours" type="number" defaultValue={member.weeklyCapacityHours} />
            <SelectField
              label="Availability"
              name="availability"
              defaultValue={member.availability}
              options={[
                { value: 'available', label: 'Available' },
                { value: 'busy', label: 'Busy' },
                { value: 'on_leave', label: 'On leave' },
              ]}
            />
          </div>
          <TextField label="Skills" name="skills" defaultValue={member.skills.join(', ')} />
          {member.role === 'super_admin' ? (
            <input type="hidden" name="role" value="admin" />
          ) : (
            <SelectField
              label="Role"
              name="role"
              defaultValue={member.role}
              disabled={!canChangeRole}
              hint={canChangeRole ? 'Changing the role signs the person out so new permissions apply.' : 'Only a Super Admin can change roles.'}
              options={[
                { value: 'employee', label: 'Team member' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
          )}
          {!canChangeRole && member.role !== 'super_admin' && <input type="hidden" name="role" value={member.role} />}
          <div className="flex justify-end">
            <SubmitButton>Save</SubmitButton>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}
