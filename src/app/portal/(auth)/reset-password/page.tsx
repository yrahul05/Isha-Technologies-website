import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/portal/auth-forms';
import { peekAuthToken } from '@/server/auth/tokens';

export const metadata: Metadata = { title: 'Choose a new password' };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  const valid = await peekAuthToken(token);

  if (!valid) {
    return (
      <>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Link expired</h1>
        <p className="mt-1.5 text-sm text-slate-500">This link is invalid, has expired, or was already used.</p>
        <Link href="/portal/forgot-password" className="mt-6 inline-block text-sm font-semibold text-brand hover:underline">
          Request a new link
        </Link>
      </>
    );
  }

  const invite = valid.token.type === 'invite';
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{invite ? `Welcome, ${valid.user.name.split(' ')[0]}` : 'Choose a new password'}</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        {invite ? `Set a password to activate your portal account (${valid.user.email}).` : `For ${valid.user.email}.`}
      </p>
      <div className="mt-6">
        <ResetPasswordForm token={token} cta={invite ? 'Activate account' : 'Update password'} />
      </div>
    </>
  );
}
