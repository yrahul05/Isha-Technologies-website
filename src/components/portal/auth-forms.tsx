'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { ActionForm, Field, SubmitButton, inputClass } from './forms';
import { loginAction, verifyMfaAction } from '@/server/actions/auth';
import { cn } from '@/lib/utils';

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input {...props} type={visible ? 'text' : 'password'} className={cn(inputClass, 'pl-10 pr-10')} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={loginAction}>
      <input type="hidden" name="next" value={next ?? ''} />
      <Field label="Email or username" name="identifier" required>
        {(p) => (
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input {...p} autoComplete="username" autoFocus required className={cn(inputClass, 'pl-10')} placeholder="you@company.com" />
          </div>
        )}
      </Field>
      <Field label="Password" name="password" required>
        {(p) => <PasswordInput {...p} autoComplete="current-password" required placeholder="••••••••••" />}
      </Field>
      <p className="text-xs leading-relaxed text-slate-500">Forgot your password? Contact your administrator at Isha Technologies — they can set a new one for you.</p>
      <SubmitButton className="h-11 w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </ActionForm>
  );
}

export function MfaForm({ next }: { next?: string }) {
  return (
    <ActionForm action={verifyMfaAction}>
      <input type="hidden" name="next" value={next ?? ''} />
      <Field label="6-digit code" name="code" required>
        {(p) => (
          <input
            {...p}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            autoFocus
            required
            className={cn(inputClass, 'text-center font-mono text-lg tracking-[0.5em]')}
            placeholder="000000"
          />
        )}
      </Field>
      <SubmitButton className="h-11 w-full" pendingLabel="Verifying…">
        Verify and continue
      </SubmitButton>
    </ActionForm>
  );
}
