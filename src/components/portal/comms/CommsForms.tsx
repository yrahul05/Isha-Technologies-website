'use client';

import { useState, useTransition } from 'react';
import { CalendarPlus, CheckCheck, Megaphone } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, CheckboxList, SelectField, SubmitButton, TextAreaField, TextField, Toggle } from '../forms';
import { markAllNotificationsRead, sendAnnouncementAction, setNotificationRead } from '@/server/actions/notifications';
import { cancelLeaveAction, requestLeaveAction, reviewLeaveAction } from '@/server/actions/leave';

const AUDIENCES = [
  { value: 'employees', label: 'All team members (employees only)' },
  { value: 'selected_users', label: 'Specific people' },
  { value: 'clients', label: 'All clients' },
  { value: 'selected_clients', label: 'Specific client accounts' },
  { value: 'everyone', label: 'Everyone (team + clients)' },
];

export function AnnouncementComposer({
  people,
  clients,
  defaultClientId,
}: {
  people: { id: string; name: string; meta: string }[];
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const [audience, setAudience] = useState(defaultClientId ? 'selected_clients' : 'employees');
  return (
    <ActionForm action={sendAnnouncementAction} resetOnSuccess>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Type"
          name="kind"
          defaultValue="general"
          options={[
            { value: 'general', label: 'Announcement / update' },
            { value: 'office', label: 'Office announcement' },
            { value: 'holiday', label: 'Holiday' },
            { value: 'leave', label: 'Leave notification' },
            { value: 'maintenance', label: 'Maintenance notice' },
            { value: 'emergency', label: 'Emergency notice' },
          ]}
        />
        <SelectField label="Audience" name="audience" value={audience} onChange={(e) => setAudience(e.target.value)} options={AUDIENCES} hint="Only the audience you choose receives it." />
      </div>
      {audience === 'selected_users' && <CheckboxList label="People" name="userIds" options={people.map((p) => ({ value: p.id, label: p.name, meta: p.meta }))} />}
      {audience === 'selected_clients' && <CheckboxList label="Client accounts" name="clientIds" defaultValues={defaultClientId ? [defaultClientId] : []} options={clients.map((c) => ({ value: c.id, label: c.name }))} hint="Every active login at the selected clients receives it." />}
      <TextField label="Title" name="title" required placeholder="Office will remain closed tomorrow" />
      <TextAreaField label="Message" name="body" required rows={4} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Priority"
          name="priority"
          defaultValue="normal"
          options={[
            { value: 'low', label: 'Low' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High (sound + email)' },
            { value: 'urgent', label: 'Urgent (sound + email)' },
          ]}
        />
        <TextField label="Date (optional)" name="effectiveDate" type="date" />
        <TextField label="Link (optional)" name="link" placeholder="/portal/projects/…" />
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Sending…">
          <Megaphone className="h-4 w-4" /> Send
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function NotificationRowActions({ id, read }: { id: string; read: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => setNotificationRead(id, !read))} className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-brand/5 hover:text-brand disabled:opacity-50">
      Mark {read ? 'unread' : 'read'}
    </button>
  );
}

export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => markAllNotificationsRead())} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand disabled:opacity-50">
      <CheckCheck className="h-4 w-4" /> Mark all read
    </button>
  );
}

export function RequestLeaveButton() {
  return (
    <Modal trigger={<><CalendarPlus className="h-4 w-4" /> Request leave</>} title="Request leave">
      {(close) => (
        <ActionForm action={requestLeaveAction} onSuccess={close}>
          <SelectField
            label="Leave type"
            name="type"
            defaultValue="casual"
            options={[
              { value: 'casual', label: 'Casual' },
              { value: 'sick', label: 'Sick' },
              { value: 'earned', label: 'Earned / privilege' },
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="From" name="startDate" type="date" required />
            <TextField label="To" name="endDate" type="date" required />
          </div>
          <TextAreaField label="Reason" name="reason" rows={3} />
          <div className="flex justify-end">
            <SubmitButton>Submit request</SubmitButton>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}

export function ReviewLeaveForm({ id }: { id: string }) {
  return (
    <ActionForm action={reviewLeaveAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input name="note" placeholder="Note (optional)" aria-label="Review note" className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none" />
      <Toggle name="announce" label="Notify the team" description="Sends a leave notification to employees only" defaultChecked />
      <div className="flex gap-2">
        <SubmitButton name="decision" value="approved" className="h-8 px-3 text-xs">
          Approve
        </SubmitButton>
        <SubmitButton name="decision" value="rejected" variant="secondary" className="h-8 px-3 text-xs">
          Reject
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function CancelLeaveButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(async () => void (await cancelLeaveAction(id)))} className="text-xs font-semibold text-slate-500 hover:text-rose-600">
      Cancel
    </button>
  );
}
