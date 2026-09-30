import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { MfaForm } from '@/components/portal/auth-forms';
import { getViewer, isMfaPending } from '@/server/auth/viewer';
import { logoutAction } from '@/server/actions/auth';

export const metadata: Metadata = { title: 'Two-step verification' };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getViewer()) redirect('/portal/dashboard');
  if (!(await isMfaPending())) redirect('/portal/login');

  return (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Two-step verification</h1>
      <p className="mt-1.5 text-sm text-slate-500">Enter the 6-digit code from your authenticator app.</p>
      <div className="mt-6">
        <MfaForm next={next} />
      </div>
      <form action={logoutAction} className="mt-6">
        <button className="text-xs font-semibold text-slate-500 hover:text-brand">Use a different account</button>
      </form>
    </>
  );
}
