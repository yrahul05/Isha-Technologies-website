'use client';

import { useState, useTransition } from 'react';
import { Lock, Plus } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField, inputClass } from '../forms';
import { clientTicketStatusAction, createTicketAction, replyTicketAction, updateTicketAction } from '@/server/actions/tickets';
import { cn } from '@/lib/utils';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'].map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }));
const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'incident', label: 'Incident / outage' },
  { value: 'access', label: 'Access request' },
  { value: 'change', label: 'Change request' },
  { value: 'billing', label: 'Billing' },
  { value: 'question', label: 'Question' },
];
const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting_for_client', label: 'Waiting for client' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function NewTicketButton({
  isInternal,
  clients,
  projects,
  people,
  defaultClientId,
  autoOpen,
}: {
  isInternal: boolean;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
  people: { id: string; name: string }[];
  defaultClientId?: string;
  autoOpen?: boolean;
}) {
  const [clientId, setClientId] = useState(defaultClientId ?? '');
  const projectChoices = isInternal ? projects.filter((p) => p.clientId === clientId) : projects;
  return (
    <Modal defaultOpen={autoOpen} trigger={<><Plus className="h-4 w-4" /> {isInternal ? 'New ticket' : 'Raise a ticket'}</>} title={isInternal ? 'New ticket' : 'Raise a support ticket'} description={isInternal ? undefined : 'Our team is notified immediately. You can attach files after creating it.'} wide>
      {() => (
        <ActionForm action={createTicketAction}>
          <TextField label="Subject" name="subject" required autoFocus />
          <div className="grid gap-4 sm:grid-cols-2">
            {isInternal && <SelectField label="Client" name="clientId" required value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Select client" options={clients.map((c) => ({ value: c.id, label: c.name }))} />}
            <SelectField label="Project" name="projectId" key={clientId} placeholder="Not project-specific" options={projectChoices.map((p) => ({ value: p.id, label: p.name }))} />
            <SelectField label="Priority" name="priority" defaultValue="medium" options={PRIORITIES} />
            <SelectField label="Category" name="category" defaultValue="general" options={CATEGORIES} />
            {isInternal && <SelectField label="Assignee" name="assigneeId" placeholder="Unassigned" options={people.map((p) => ({ value: p.id, label: p.name }))} />}
          </div>
          <TextAreaField label="Description" name="description" required rows={6} placeholder="What happened, when, and what you expected." />
          <div className="flex justify-end">
            <SubmitButton>Create ticket</SubmitButton>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}

export function TicketReply({ ticketId, isInternal }: { ticketId: string; isInternal: boolean }) {
  return (
    <ActionForm action={replyTicketAction} resetOnSuccess showSuccess={false}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <textarea name="body" rows={4} placeholder="Write a reply…" aria-label="Reply" className={cn(inputClass, 'resize-y')} />
      <div className="flex items-center justify-between gap-3">
        {isInternal ? (
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" name="internal" className="h-4 w-4 rounded accent-[#3478e4]" />
            <Lock className="h-3.5 w-3.5" /> Internal note (not visible to client)
          </label>
        ) : (
          <span className="text-xs text-slate-500">Replies notify your Isha Technologies team.</span>
        )}
        <SubmitButton>Send reply</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function TicketControls({
  ticket,
  people,
  canReassign,
}: {
  ticket: { id: string; status: string; priority: string; category: string; assigneeId: string | null };
  people: { id: string; name: string }[];
  canReassign: boolean;
}) {
  return (
    <ActionForm action={updateTicketAction}>
      <input type="hidden" name="ticketId" value={ticket.id} />
      <SelectField label="Status" name="status" defaultValue={ticket.status} options={STATUSES} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Priority" name="priority" defaultValue={ticket.priority} options={PRIORITIES} />
        <SelectField label="Category" name="category" defaultValue={ticket.category} options={CATEGORIES} />
      </div>
      <SelectField label="Assignee" name="assigneeId" defaultValue={ticket.assigneeId ?? ''} disabled={!canReassign} placeholder="Unassigned" options={people.map((p) => ({ value: p.id, label: p.name }))} />
      {!canReassign && <input type="hidden" name="assigneeId" value={ticket.assigneeId ?? ''} />}
      <SubmitButton className="w-full">Update ticket</SubmitButton>
    </ActionForm>
  );
}

export function ClientTicketButtons({ ticketId, status }: { ticketId: string; status: string }) {
  const [pending, start] = useTransition();
  const closed = status === 'closed';
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => void (await clientTicketStatusAction(ticketId, closed ? 'reopen' : 'close')))}
      className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand disabled:opacity-50"
    >
      {closed ? 'Reopen ticket' : 'Close ticket'}
    </button>
  );
}
