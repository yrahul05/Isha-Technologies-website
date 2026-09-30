'use client';

import { ActionForm, SelectField, SubmitButton, TextField } from '../forms';
import { createClientAction, updateClientAction } from '@/server/actions/clients';
import { GST_STATES } from '@/lib/portal/invoice-math';

type ClientValues = Partial<{
  id: string;
  companyName: string;
  legalName: string | null;
  contactName: string;
  email: string;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  gstin: string | null;
  pan: string | null;
  industry: string | null;
  website: string | null;
  accountManagerId: string | null;
  status: string;
}>;

export function ClientForm({
  initial,
  managers,
  onDone,
}: {
  initial?: ClientValues;
  managers: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const v = initial ?? {};
  return (
    <ActionForm action={v.id ? updateClientAction : createClientAction} onSuccess={() => onDone?.()}>
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">Company</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Company name" name="companyName" required defaultValue={v.companyName} />
        <TextField label="Legal name" name="legalName" defaultValue={v.legalName ?? ''} hint="As it should appear on invoices" />
        <TextField label="Industry" name="industry" defaultValue={v.industry ?? ''} />
        <TextField label="Website" name="website" defaultValue={v.website ?? ''} />
      </div>
      <p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-brand">Primary contact</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Contact person" name="contactName" required defaultValue={v.contactName} />
        <TextField label="Email" name="email" type="email" required defaultValue={v.email} />
        <TextField label="Phone" name="phone" defaultValue={v.phone ?? ''} />
      </div>
      <p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-brand">Billing address & tax</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Address line 1" name="addressLine1" defaultValue={v.addressLine1 ?? ''} />
        <TextField label="Address line 2" name="addressLine2" defaultValue={v.addressLine2 ?? ''} />
        <TextField label="City" name="city" defaultValue={v.city ?? ''} />
        <SelectField label="State" name="state" defaultValue={v.state ?? ''} placeholder="Select state" options={GST_STATES.map((s) => ({ value: s.name, label: s.name }))} />
        <TextField label="Postal code" name="postalCode" defaultValue={v.postalCode ?? ''} />
        <TextField label="Country" name="country" defaultValue={v.country ?? 'India'} />
        <TextField label="GSTIN" name="gstin" defaultValue={v.gstin ?? ''} hint="Optional · first two digits set the GST place of supply" className="font-mono" />
        <TextField label="PAN" name="pan" defaultValue={v.pan ?? ''} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Account manager" name="accountManagerId" defaultValue={v.accountManagerId ?? ''} placeholder="Unassigned" options={managers.map((m) => ({ value: m.id, label: m.name }))} />
        <SelectField
          label="Status"
          name="status"
          defaultValue={v.status ?? 'active'}
          options={[
            { value: 'onboarding', label: 'Onboarding' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive (locks all client logins)' },
          ]}
        />
      </div>
      <div className="flex justify-end pt-2">
        <SubmitButton>{v.id ? 'Save changes' : 'Create client'}</SubmitButton>
      </div>
    </ActionForm>
  );
}
