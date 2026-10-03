'use client';

import { useState } from 'react';
import { CalendarClock, Check, Video, X } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, CheckboxList, SelectField, SubmitButton, TextAreaField, TextField } from '../forms';
import { requestMeetingAction, reviewMeetingRequestAction } from '@/server/actions/meetings';
import { cn } from '@/lib/utils';

type Opt = { id: string; name: string; meta?: string };
const DURATIONS = [15, 30, 45, 60, 90, 120].map((m) => ({ value: String(m), label: `${m} min` }));

/**
 * Client: propose a meeting. Participants are limited (server-side) to the
 * client's own colleagues and their project team; nothing is booked until
 * Isha Technologies approves it.
 */
export function RequestMeetingButton({ projects, people }: { projects: Opt[]; people: Opt[] }) {
  const tomorrow = new Date(Date.now() + 5.5 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);
  return (
    <Modal
      wide
      title="Request a meeting"
      description="Propose a time and who should join. Isha Technologies will confirm (or suggest another time) and send the Google Meet invite."
      trigger={
        <>
          <CalendarClock className="h-4 w-4" /> Request a meeting
        </>
      }
    >
      {() => (
        <ActionForm action={requestMeetingAction}>
          <TextField label="Topic" name="title" required maxLength={200} placeholder="e.g. Q3 infrastructure review" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Project" name="projectId" placeholder="General / not project-specific" options={projects.map((p) => ({ value: p.id, label: p.name }))} />
            <SelectField label="Duration" name="durationMinutes" defaultValue="30" options={DURATIONS.filter((d) => Number(d.value) <= 120)} />
            <TextField label="Preferred date" name="date" type="date" required defaultValue={tomorrow} />
            <TextField label="Preferred time (IST)" name="time" type="time" required defaultValue="11:00" />
          </div>
          <CheckboxList label="Who should join" name="participantIds" options={people.map((p) => ({ value: p.id, label: p.name, meta: p.meta }))} hint="Your colleagues and the Isha Technologies team on your projects." />
          <TextAreaField label="Agenda" name="agenda" rows={3} placeholder={'What would you like to cover?'} />
          <div className="flex justify-end">
            <SubmitButton pendingLabel="Sending…">Send request</SubmitButton>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}

/**
 * Meeting manager (Super Admin / Admin): confirm — optionally moving the
 * time and adding Admins, employees or more of the client's people — or
 * decline with a note. Confirmation can create a Google Meet from the
 * reviewer's own connected Google account.
 */
export function ReviewMeetingRequestForm({
  id,
  date,
  time,
  durationMinutes,
  candidates,
  googleEmail,
}: {
  id: string;
  date: string;
  time: string;
  durationMinutes: number;
  candidates: Opt[];
  googleEmail: string | null;
}) {
  const [mode, setMode] = useState<'google_meet' | 'manual'>(googleEmail ? 'google_meet' : 'manual');
  return (
    <ActionForm action={reviewMeetingRequestAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="mode" value={mode} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Date" name="date" type="date" required defaultValue={date} />
        <TextField label="Time (IST)" name="time" type="time" required defaultValue={time} hint="Change to reschedule." />
        <SelectField label="Duration" name="durationMinutes" defaultValue={String(durationMinutes)} options={DURATIONS} />
      </div>
      <CheckboxList label="Add participants" name="addParticipantIds" options={candidates.map((c) => ({ value: c.id, label: c.name, meta: c.meta }))} hint="Team members, or other people from this client only." />
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-slate-700">Meeting link</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={!googleEmail}
            onClick={() => setMode('google_meet')}
            className={cn('flex items-start gap-3 rounded-xl border p-3 text-left', mode === 'google_meet' ? 'border-brand bg-brand/[0.05]' : 'border-gray-200 hover:border-brand/40', !googleEmail && 'cursor-not-allowed opacity-60')}
          >
            <Video className="mt-0.5 h-4 w-4 text-brand" />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Create Google Meet</span>
              <span className="block text-xs text-slate-500">{googleEmail ? `From ${googleEmail}` : 'Connect Google in Settings first'}</span>
            </span>
          </button>
          <button type="button" onClick={() => setMode('manual')} className={cn('rounded-xl border p-3 text-left', mode === 'manual' ? 'border-brand bg-brand/[0.05]' : 'border-gray-200 hover:border-brand/40')}>
            <span className="block text-sm font-semibold text-slate-900">Use my own link</span>
            <span className="block text-xs text-slate-500">Zoom, Teams, an existing Meet</span>
          </button>
        </div>
        {mode === 'manual' && <TextField label="Link (optional)" name="meetingLink" placeholder="https://" />}
      </fieldset>
      <TextAreaField label="Note to the client" name="note" rows={2} hint="Required when declining." />
      <div className="flex flex-wrap justify-end gap-2">
        <SubmitButton name="decision" value="rejected" variant="secondary">
          <X className="h-4 w-4" /> Decline
        </SubmitButton>
        <SubmitButton name="decision" value="approved" pendingLabel={mode === 'google_meet' ? 'Creating Google Meet…' : 'Confirming…'}>
          <Check className="h-4 w-4" /> Confirm meeting
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
