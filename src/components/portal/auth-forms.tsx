'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { ActionForm, Field, SubmitButton, inputClass } from './forms';
import {
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
  resetWithOtpAction,
  verifyMfaAction,
} from '@/server/actions/auth';
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
      <div className="flex justify-end">
        <Link href="/portal/forgot-password" className="text-xs font-semibold text-brand hover:underline">
          Forgot password?
        </Link>
      </div>
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

/**
 * Forgot password, two steps on one page:
 *   1. email → a 6-digit code is emailed (same response whether or not the
 *      account exists, so addresses can't be enumerated);
 *   2. code + new password → reset, all sessions signed out.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState<string | null>(null);
  if (!email) {
    return (
      <ActionForm action={forgotPasswordAction} onSuccess={(s) => setEmail(s.data?.email ?? '')} showSuccess={false}>
        <Field label="Account email" name="email" required>
          {(p) => (
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input {...p} type="email" autoComplete="email" autoFocus required className={cn(inputClass, 'pl-10')} />
            </div>
          )}
        </Field>
        <SubmitButton className="h-11 w-full" pendingLabel="Sending…">
          Email me a code
        </SubmitButton>
      </ActionForm>
    );
  }
  return (
    <ActionForm action={resetWithOtpAction}>
      <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
        If an account exists for <span className="font-semibold">{email}</span>, we&rsquo;ve emailed a 6-digit code. It expires in 10 minutes.
      </p>
      <input type="hidden" name="email" value={email} />
      <Field label="Verification code" name="code" required>
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
      <Field label="New password" name="password" required hint="At least 10 characters, mixing letters, numbers or symbols.">
        {(p) => <PasswordInput {...p} autoComplete="new-password" required />}
      </Field>
      <Field label="Confirm password" name="confirm" required>
        {(p) => <PasswordInput {...p} autoComplete="new-password" required />}
      </Field>
      <SubmitButton className="h-11 w-full" pendingLabel="Resetting…">
        Reset password
      </SubmitButton>
      <button type="button" onClick={() => setEmail(null)} className="w-full text-center text-xs font-semibold text-slate-500 hover:text-brand">
        Didn&rsquo;t get it? Send a new code
      </button>
    </ActionForm>
  );
}

export function ResetPasswordForm({ token, cta }: { token: string; cta: string }) {
  return (
    <ActionForm action={resetPasswordAction}>
      <input type="hidden" name="token" value={token} />
      <Field label="New password" name="password" required hint="At least 10 characters, mixing letters, numbers or symbols.">
        {(p) => <PasswordInput {...p} autoComplete="new-password" autoFocus required />}
      </Field>
      <Field label="Confirm password" name="confirm" required>
        {(p) => <PasswordInput {...p} autoComplete="new-password" required />}
      </Field>
      <SubmitButton className="h-11 w-full" pendingLabel="Saving…">
        {cta}
      </SubmitButton>
    </ActionForm>
  );
}
