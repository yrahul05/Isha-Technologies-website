import { redirect } from 'next/navigation';

/** Invitation links share the reset-password flow (single-use token, same form, different copy). */
export default async function AcceptInvite({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  redirect(`/portal/reset-password?token=${encodeURIComponent(token)}`);
}
