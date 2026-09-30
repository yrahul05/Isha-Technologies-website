'use client';

import { PartyPopper } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, SelectField, SubmitButton, TextField } from '../forms';
import { createCalendarEventAction } from '@/server/actions/meetings';

export function AddCalendarEventButton() {
  return (
    <Modal trigger={<><PartyPopper className="h-4 w-4" /> Add holiday / event</>} triggerVariant="secondary" title="Add to company calendar">
      {(close) => (
        <ActionForm action={createCalendarEventAction} onSuccess={close}>
          <TextField label="Title" name="title" required placeholder="Diwali" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Type"
              name="type"
              defaultValue="holiday"
              options={[
                { value: 'holiday', label: 'Holiday' },
                { value: 'event', label: 'Company event' },
                { value: 'deadline', label: 'Important date' },
              ]}
            />
            <SelectField
              label="Visible to"
              name="audience"
              defaultValue="all"
              options={[
                { value: 'all', label: 'Everyone' },
                { value: 'employees', label: 'Team only' },
                { value: 'clients', label: 'Clients only' },
              ]}
            />
            <TextField label="From" name="startsOn" type="date" required />
            <TextField label="To" name="endsOn" type="date" required />
          </div>
          <TextField label="Description" name="description" />
          <div className="flex justify-end">
            <SubmitButton>Add</SubmitButton>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}
