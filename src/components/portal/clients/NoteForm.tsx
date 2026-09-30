'use client';

import { ActionForm, SubmitButton, TextAreaField } from '../forms';
import { addClientNoteAction } from '@/server/actions/clients';

export function NoteForm({ clientId }: { clientId: string }) {
  return (
    <ActionForm action={addClientNoteAction} resetOnSuccess showSuccess={false}>
      <input type="hidden" name="clientId" value={clientId} />
      <TextAreaField label="Add a note" name="body" rows={3} placeholder="Call summary, commercial context, preferences…" />
      <div className="flex justify-end">
        <SubmitButton>Add note</SubmitButton>
      </div>
    </ActionForm>
  );
}
