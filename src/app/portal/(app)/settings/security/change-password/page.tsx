import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import { mustChangePassword, requireViewer } from '@/server/auth/viewer';
import { PageHeader, Panel } from '@/components/portal/ui';
import { PasswordChangeForm } from '@/components/portal/settings/AccountForms';

export const metadata: Metadata = { title: 'Change password' };

/**
 * Where an account lands after an administrator set or reset its password
 * ("Force password change"). requireViewer() lets ONLY this page through while the
 * change is pending; everything else redirects here until a new password is chosen.
 */
export default async function ChangePasswordPage() {
  await requireViewer();
  const forced = await mustChangePassword();
  return (
    <>
      <PageHeader eyebrow="Security" title="Change your password" description="Choose a password only you know." />
      {forced && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> An administrator set your current password. Create your own new password to continue to the portal.
        </p>
      )}
      <div className="max-w-2xl">
        <Panel title="New password" description="Enter your current password, then your new password twice.">
          <PasswordChangeForm />
        </Panel>
      </div>
    </>
  );
}
