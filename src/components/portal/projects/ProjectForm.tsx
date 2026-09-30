'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, CheckboxList, SelectField, SubmitButton, TextAreaField, TextField } from '../forms';
import { createProjectAction, updateProjectAction } from '@/server/actions/projects';

type Option = { id: string; name: string };
type ClientPerson = { id: string; name: string; clientId: string };

export type ProjectInitial = {
  id: string;
  name: string;
  clientId: string;
  description: string;
  status: string;
  priority: string;
  health: string;
  startDate: string | null;
  dueDate: string | null;
  budgetPaise: number;
  technologies: string[];
  teamIds: string[];
  leadId: string | null;
  clientMemberIds: string[];
};

function ProjectForm({
  initial,
  clients,
  team,
  clientPeople,
  defaultClientId,
  onDone,
}: {
  initial?: ProjectInitial;
  clients: Option[];
  team: (Option & { title?: string | null })[];
  clientPeople: ClientPerson[];
  defaultClientId?: string;
  onDone?: () => void;
}) {
  const [clientId, setClientId] = useState(initial?.clientId ?? defaultClientId ?? '');
  const v = initial;
  return (
    <ActionForm action={v ? updateProjectAction : createProjectAction} onSuccess={() => onDone?.()}>
      {v && <input type="hidden" name="id" value={v.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Project name" name="name" required defaultValue={v?.name} className="sm:col-span-2" />
        <SelectField
          label="Client"
          name="clientId"
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          disabled={Boolean(v)}
          placeholder="Select client"
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          hint={v ? 'A project stays with the client it was created for.' : undefined}
        />
        {v && <input type="hidden" name="clientId" value={v.clientId} />}
        <TextField label="Technologies" name="technologies" defaultValue={v?.technologies.join(', ')} placeholder="AWS, EKS, Terraform" />
        <SelectField
          label="Status"
          name="status"
          defaultValue={v?.status ?? 'planning'}
          options={['planning', 'active', 'on_hold', 'at_risk', 'completed', 'cancelled'].map((s) => ({ value: s, label: s.replace('_', ' ').replace(/^./, (c) => c.toUpperCase()) }))}
        />
        <SelectField
          label="Priority"
          name="priority"
          defaultValue={v?.priority ?? 'medium'}
          options={['low', 'medium', 'high', 'urgent'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
        />
        <SelectField
          label="Health"
          name="health"
          defaultValue={v?.health ?? 'on_track'}
          options={[
            { value: 'on_track', label: 'On track' },
            { value: 'at_risk', label: 'At risk' },
            { value: 'off_track', label: 'Off track' },
          ]}
        />
        <TextField label="Budget (₹)" name="budget" inputMode="decimal" defaultValue={v ? String(v.budgetPaise / 100) : ''} placeholder="500000" />
        <TextField label="Start date" name="startDate" type="date" defaultValue={v?.startDate ?? ''} />
        <TextField label="Expected completion" name="dueDate" type="date" defaultValue={v?.dueDate ?? ''} />
      </div>
      <TextAreaField label="Description" name="description" defaultValue={v?.description} rows={4} placeholder="Scope, outcomes and success criteria." />
      <CheckboxList
        label="Assigned team members"
        name="teamIds"
        defaultValues={v?.teamIds}
        options={team.map((t) => ({ value: t.id, label: t.name, meta: t.title ?? undefined }))}
        hint="Only these people (plus admins) can see this project."
      />
      <SelectField label="Project lead" name="leadId" defaultValue={v?.leadId ?? ''} placeholder="No lead" options={team.map((t) => ({ value: t.id, label: t.name }))} />
      <CheckboxList
        key={clientId}
        label="Client members"
        name="clientMemberIds"
        defaultValues={v?.clientMemberIds}
        options={clientPeople.filter((p) => p.clientId === clientId).map((p) => ({ value: p.id, label: p.name }))}
        hint={clientId ? 'Contacts at this client who receive project updates.' : 'Select a client first.'}
      />
      <div className="flex justify-end">
        <SubmitButton>{v ? 'Save project' : 'Create project'}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function NewProjectButton({ autoOpen, ...props }: Omit<Parameters<typeof ProjectForm>[0], 'initial' | 'onDone'> & { autoOpen?: boolean }) {
  return (
    <Modal defaultOpen={autoOpen} trigger={<><Plus className="h-4 w-4" /> New project</>} title="New project" description="Choose who can see it — only assigned members and admins will." wide>
      {(close) => <ProjectForm {...props} onDone={close} />}
    </Modal>
  );
}

export function EditProjectButton(props: Omit<Parameters<typeof ProjectForm>[0], 'onDone'> & { initial: ProjectInitial }) {
  return (
    <Modal trigger={<><Pencil className="h-4 w-4" /> Edit project</>} triggerVariant="secondary" title="Edit project" wide>
      {(close) => <ProjectForm {...props} onDone={close} />}
    </Modal>
  );
}
