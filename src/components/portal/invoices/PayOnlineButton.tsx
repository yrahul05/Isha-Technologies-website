'use client';

import { useState, useTransition } from 'react';
import { CreditCard } from 'lucide-react';
import { startOnlinePaymentAction } from '@/server/actions/payments';

export function PayOnlineButton({ invoiceId, amountLabel }: { invoiceId: string; amountLabel: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await startOnlinePaymentAction(invoiceId);
            if (r.ok && r.data?.url) window.location.assign(r.data.url);
            else setError(r.error ?? 'Could not start the payment.');
          })
        }
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
      >
        <CreditCard className="h-4 w-4" /> {pending ? 'Opening checkout…' : `Pay ${amountLabel} online`}
      </button>
      {error && <span role="alert" className="max-w-xs text-right text-xs text-rose-600">{error}</span>}
    </span>
  );
}
