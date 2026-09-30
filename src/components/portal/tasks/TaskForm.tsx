'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from '../forms';
import { createTaskAction, updateTaskAction } from '@/server/actions/tasks';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'review', label: 'Review' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'].map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }));
const VISIBILITY_OPTIONS = [
  { value: 'internal', label: 'Internal — team only' },
  { value: 'client', label: 'Shared with client' },
];

export type TaskValues = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: string | null;
  visibility: string;
  estimateHours: number | null;
};

export function NewTaskButton({
  projects,
  people,
  defaultProjectId,
  autoOpen,
}: {
  projects: { id: string; name: string }[];
  people: { id: string; name: string }[];
  defaultProjectId?: string;
  autoOpen?: boolean;
}) {
  const router = useRouter();
  return (
    <Modal defaultOpen={autoOpen} trigger={<><Plus className="h-4 w-4" /> New task</>} title="New task" wide>
      {(close) => (
        <ActionForm
          action={createTaskAction}
          onSuccess={(s) => {
            close();
            if (s.data?.id) router.push(`/portal/tasks/${s.data.id}`);
          }}
        >
          <TextField label="Title" name="title" required autoFocus />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Project" name="projectId" required defaultValue={defaultProjectId ?? ''} placeholder="Select project" options={projects.map((p) => ({ value: p.id, label: p.name }))} />
            <SelectField label="Assignee" name="assigneeId" placeholder="Unassigned" options={people.map((p) => ({ value: p.id, label: p.name }))} />
            <SelectField label="Status" name="status" defaultValue="todo" options={STATUS_OPTIONS} />
            <SelectField label="Priority" name="priority" defaultValue="medium" options={PRIORITY_OPTIONS} />
            <TextField label="Due date" name="dueDate" type="date" />
            <TextField label="Estimate (hours)" name="estimateHours" type="number" step="0.5" min="0" />
          </div>
          <SelectField label="Visibility" name="visibility" defaultValue="internal" options={VISIBILITY_OPTIONS} hint="Client-visible tasks appear in the client's portal as action items." />
          <TextAreaField label="Description" name="description" rows={4} />
          <TextAreaField label="Checklist" name="checklist" rows={3} hint="One sub-task per line." />
          <div className="flex justify-end">
            <SubmitButton>Create task</SubmitButton>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}

export function TaskEditForm({ task, people }: { task: TaskValues; people: { id: string; name: string }[] }) {
  return (
    <ActionForm action={updateTaskAction}>
      <input type="hidden" name="id" value={task.id} />
      <TextField label="Title" name="title" required defaultValue={task.title} />
      <SelectField label="Status" name="status" defaultValue={task.status} options={STATUS_OPTIONS} />
      <SelectField label="Assignee" name="assigneeId" defaultValue={task.assigneeId ?? ''} placeholder="Unassigned" options={people.map((p) => ({ value: p.id, label: p.name }))} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Priority" name="priority" defaultValue={task.priority} options={PRIORITY_OPTIONS} />
        <TextField label="Due date" name="dueDate" type="date" defaultValue={task.dueDate ?? ''} />
      </div>
      <TextField label="Estimate (hours)" name="estimateHours" type="number" step="0.5" defaultValue={task.estimateHours ?? ''} />
      <SelectField label="Visibility" name="visibility" defaultValue={task.visibility} options={VISIBILITY_OPTIONS} />
      <TextAreaField label="Description" name="description" defaultValue={task.description} rows={5} />
      <SubmitButton className="w-full">Save task</SubmitButton>
    </ActionForm>
  );
}
