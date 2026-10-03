import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { LoginForm } from '@/components/portal/auth-forms';
import { getViewer } from '@/server/auth/viewer';

export const metadata: Metadata = { title: 'Sign in' };

const NOTICES: Record<string, string> = {
  signed_out: 'You have been signed out.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  if (await getViewer()) redirect('/portal/dashboard');
  const notice = Object.keys(NOTICES).find((k) => params[k]);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to your portal</h1>
      <p className="mt-1.5 text-sm text-slate-500">For Isha Technologies clients and team members.</p>
      {notice && (
        <p role="status" className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {NOTICES[notice]}
        </p>
      )}
      <div className="mt-6">
        <LoginForm next={params.next} />
      </div>
      <p className="mt-8 text-xs leading-relaxed text-slate-500">
        There is no self-registration: accounts are created by your Isha Technologies administrator. Need access or forgot your password? Contact your administrator. You&rsquo;ll stay signed in for the rest of the day on this device.
      </p>
    </>
  );
}
