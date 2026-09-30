'use client';

import { useState, useTransition } from 'react';
import { Ban, CircleDollarSign, Send } from 'lucide-react';
import { Modal } from '../modal';
import { ActionForm, SelectField, SubmitButton, TextField } from '../forms';
import { cancelInvoiceAction, recordPaymentAction, sendInvoiceAction } from '@/server/actions/invoices';
import type { ActionState } from '@/server/actions/types';

export function RecordPaymentButton({ invoiceId, dueLabel, dueRupees }: { invoiceId: string; dueLabel: string; dueRupees: string }) {
  const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  return (
    <Modal trigger={<><CircleDollarSign className="h-4 w-4" /> Record payment</>} title="Record payment" description={`Balance due: ${dueLabel}`}>
      {(close) => (
        <ActionForm action={recordPaymentAction} onSuccess={close}>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Amount (₹)" name="amount" required inputMode="decimal" defaultValue={dueRupees} />
            <TextField label="Payment date" name="paidOn" type="date" required defaultValue={today} max={today} />
            <SelectField
              label="Method"
              name="method"
              defaultValue="bank_transfer"
              options={[
                { value: 'bank_transfer', label: 'Bank transfer (NEFT/RTGS/IMPS)' },
                { value: 'upi', label: 'UPI' },
                { value: 'card', label: 'Card' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'cash', label: 'Cash' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <TextField label="Reference / UTR" name="reference" />
          </div>
          <TextField label="Notes" name="notes" />
          <div className="flex justify-end">
            <SubmitButton>Record payment</SubmitButton>
          </div>
        </ActionForm>
      )}
    </Modal>
  );
}

export function InvoiceStatusButtons({ id, canSend, canCancel }: { id: string; canSend: boolean; canCancel: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  const [confirmCancel, setConfirmCancel] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSend && (
        <button
          disabled={pending}
          onClick={() => start(async () => setState(await sendInvoiceAction(id)))}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand bg-white px-4 text-sm font-medium text-brand hover:bg-brand hover:text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Send to client
        </button>
      )}
      {canCancel &&
        (confirmCancel ? (
          <span className="inline-flex items-center gap-1.5">
            <button disabled={pending} onClick={() => start(async () => setState(await cancelInvoiceAction(id)))} className="h-10 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white hover:bg-rose-700">
              Confirm cancel
            </button>
            <button onClick={() => setConfirmCancel(false)} className="h-10 px-2 text-sm font-semibold text-slate-500">
              Keep
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirmCancel(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600">
            <Ban className="h-4 w-4" /> Cancel invoice
          </button>
        ))}
      {state.error && <span className="text-sm text-rose-600">{state.error}</span>}
      {state.ok && state.message && <span className="text-sm text-emerald-700">{state.message}</span>}
    </div>
  );
}
