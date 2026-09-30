'use client';

import { useState, useTransition } from 'react';
import { CalendarPlus, Pencil, Video } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, CheckboxList, SelectField, SubmitButton, TextAreaField, TextField } from '../forms';
import { cancelMeetingAction, saveMeetingAction } from '@/server/actions/meetings';
import { cn } from '@/lib/utils';

type Opt = { id: string; name: string };
export type MeetingFormProps = {
  clients: Opt[];
  projects: (Opt & { clientId: string })[];
  team: (Opt & { title?: string | null })[];
  clientPeople: (Opt & { clientId: string })[];
  googleEmail: string | null;
  googleConfigured: boolean;
  defaultClientId?: string;
  initial?: {
    id: string;
    title: string;
    clientId: string | null;
    projectId: string | null;
    date: string;
    time: string;
    durationMinutes: number;
    description: string;
    agenda: string;
    teamIds: string[];
    clientAttendeeIds: string[];
    meetingLink: string | null;
    provider: 'google_meet' | 'manual';
  };
};

function MeetingForm({ clients, projects, team, clientPeople, googleEmail, googleConfigured, defaultClientId, initial }: MeetingFormProps) {
  const [clientId, setClientId] = useState(initial?.clientId ?? defaultClientId ?? '');
  const [mode, setMode] = useState<'google_meet' | 'manual'>(initial?.provider ?? (googleEmail ? 'google_meet' : 'manual'));
  const tomorrow = new Date(Date.now() + 5.5 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);
  const editingGoogle = initial?.provider === 'google_meet';

  return (
    <ActionForm action={saveMeetingAction}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="mode" value={mode} />
      <TextField label="Meeting title" name="title" required defaultValue={initial?.title} placeholder="Weekly delivery sync" />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Client" name="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Internal meeting" options={clients.map((c) => ({ value: c.id, label: c.name }))} />
        <SelectField label="Project" name="projectId" key={clientId} defaultValue={initial?.projectId ?? ''} placeholder="No project" options={projects.filter((p) => !clientId || p.clientId === clientId).map((p) => ({ value: p.id, label: p.name }))} />
        <TextField label="Date" name="date" type="date" required defaultValue={initial?.date ?? tomorrow} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Time (IST)" name="time" type="time" required defaultValue={initial?.time ?? '11:00'} />
          <SelectField label="Duration" name="durationMinutes" defaultValue={String(initial?.durationMinutes ?? 30)} options={[15, 30, 45, 60, 90, 120].map((m) => ({ value: String(m), label: `${m} min` }))} />
        </div>
      </div>

      {!editingGoogle && (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-700">Meeting link</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => googleEmail && setMode('google_meet')}
              disabled={!googleEmail}
              className={cn('flex items-start gap-3 rounded-xl border p-3 text-left transition-colors', mode === 'google_meet' ? 'border-brand bg-brand/[0.05]' : 'border-gray-200 hover:border-brand/40', !googleEmail && 'cursor-not-allowed opacity-60')}
            >
              <Video className="mt-0.5 h-4 w-4 text-brand" />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Create Google Meet</span>
                <span className="block text-xs text-slate-500">
                  {googleEmail ? `From ${googleEmail} · invites sent by Google` : googleConfigured ? 'Connect Google in Settings first' : 'Google OAuth not configured'}
                </span>
              </span>
            </button>
            <button type="button" onClick={() => setMode('manual')} className={cn('rounded-xl border p-3 text-left transition-colors', mode === 'manual' ? 'border-brand bg-brand/[0.05]' : 'border-gray-200 hover:border-brand/40')}>
              <span className="block text-sm font-semibold text-slate-900">Use my own link</span>
              <span className="block text-xs text-slate-500">Zoom, Teams, an existing Meet, or in person</span>
            </button>
          </div>
          {mode === 'manual' && <TextField label="Link (optional)" name="meetingLink" defaultValue={initial?.meetingLink ?? ''} placeholder="https://" />}
        </fieldset>
      )}

      <CheckboxList label="Team attendees" name="teamIds" defaultValues={initial?.teamIds} options={team.map((t) => ({ value: t.id, label: t.name, meta: t.title ?? undefined }))} />
      <CheckboxList
        key={`c-${clientId}`}
        label="Client attendees"
        name="clientAttendeeIds"
        defaultValues={initial?.clientAttendeeIds}
        options={clientPeople.filter((p) => p.clientId === clientId).map((p) => ({ value: p.id, label: p.name }))}
        hint={clientId ? 'Only people at this client can be invited.' : 'Pick a client to invite their team.'}
      />
      <TextAreaField label="Agenda" name="agenda" rows={3} defaultValue={initial?.agenda} placeholder={'1. Progress\n2. Risks\n3. Next steps'} />
      <TextAreaField label="Description" name="description" rows={2} defaultValue={initial?.description} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel={mode === 'google_meet' ? 'Creating Google Meet…' : 'Saving…'}>{initial ? 'Save changes' : 'Schedule meeting'}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function ScheduleMeetingButton(props: MeetingFormProps & { autoOpen?: boolean }) {
  return (
    <Modal defaultOpen={props.autoOpen} trigger={<><CalendarPlus className="h-4 w-4" /> Schedule meeting</>} title="Schedule a meeting" description="Attendees are notified in the portal instantly." wide>
      {() => <MeetingForm {...props} />}
    </Modal>
  );
}

export function EditMeetingButton(props: MeetingFormProps) {
  return (
    <Modal trigger={<><Pencil className="h-4 w-4" /> Reschedule / edit</>} triggerVariant="secondary" title="Edit meeting" description={props.initial?.provider === 'google_meet' ? 'Changes sync to the Google Calendar event and its invitees.' : undefined} wide>
      {() => <MeetingForm {...props} />}
    </Modal>
  );
}

export function CancelMeetingButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return confirm ? (
    <span className="inline-flex items-center gap-2">
      <button disabled={pending} onClick={() => start(async () => setMsg((await cancelMeetingAction(id)).error ?? null))} className="h-10 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white hover:bg-rose-700">
        Confirm cancel
      </button>
      <button onClick={() => setConfirm(false)} className="text-sm font-semibold text-slate-500">
        Keep
      </button>
      {msg && <span className="text-sm text-rose-600">{msg}</span>}
    </span>
  ) : (
    <button onClick={() => setConfirm(true)} className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600">
      Cancel meeting
    </button>
  );
}
