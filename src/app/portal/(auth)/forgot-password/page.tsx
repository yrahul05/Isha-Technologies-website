import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ForgotPasswordForm } from '@/components/portal/auth-forms';

export const metadata: Metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reset your password</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Enter the email on your portal account and we&rsquo;ll send a secure link valid for 30 minutes.
      </p>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
      <Link href="/portal/login" className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>
    </>
  );
}
