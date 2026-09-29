'use client';

import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Password gate for /analytics. Submits to /api/analytics/auth, which sets
 * an httpOnly session cookie on success — this component never sees or
 * stores the real password anywhere except the single fetch body, and
 * never touches the GA4 service-account credentials at all (those only
 * ever exist inside the server-side GA4 Data API routes).
 */
export function AnalyticsLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'invalid' | 'unavailable'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      const res = await fetch('/api/analytics/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // The page itself is a server component that decides login-form
        // vs. dashboard by reading the cookie — refresh re-runs it now
        // that the cookie is set, instead of duplicating that logic here.
        router.refresh();
        return;
      }

      setStatus(res.status === 503 ? 'unavailable' : 'invalid');
    } catch {
      setStatus('invalid');
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-4 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Lock className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">Analytics Dashboard</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        This is an internal dashboard. Enter the access password to continue.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 w-full space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (status !== 'idle' && status !== 'submitting') setStatus('idle');
          }}
          placeholder="Password"
          autoFocus
          aria-invalid={status === 'invalid'}
          aria-describedby={status === 'invalid' ? 'analytics-password-error' : undefined}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 ease-out focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 aria-invalid:border-red-400 aria-invalid:focus:ring-red-100"
        />
        {status === 'invalid' && (
          <p id="analytics-password-error" role="alert" className="text-xs font-medium text-red-600">
            Incorrect password.
          </p>
        )}
        {status === 'unavailable' && (
          <p role="alert" className="text-xs font-medium text-red-600">
            The dashboard isn&apos;t configured yet — set ANALYTICS_DASHBOARD_PASSWORD.
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={status === 'submitting' || !password}
          className="h-11 w-full rounded-lg"
        >
          {status === 'submitting' ? 'Checking…' : 'View Dashboard'}
        </Button>
      </form>
    </div>
  );
}
