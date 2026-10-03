import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can, requireViewer } from '@/server/auth/viewer';
import { PageHeader } from '@/components/portal/ui';
import { AssistantChat } from '@/components/portal/assistant/AssistantChat';

export const metadata: Metadata = { title: 'Isha AI' };

export default async function AssistantPage() {
  const viewer = await requireViewer();
  if (viewer.isInternal && !can(viewer, 'ai.use')) notFound();
  const suggestions = viewer.isInternal
    ? ['What tasks are overdue?', 'Which invoices are overdue?', 'What meetings do I have this month?', 'What expires in the next 30 days?']
    : ['What is the status of my projects?', 'Do I have any unpaid invoices?', 'When is my next meeting?', 'Which proposals are waiting for me?'];
  return (
    <>
      <PageHeader eyebrow="Assistant" title="Isha AI" description="Ask questions in plain language. Answers come only from data your account can already access." />
      <AssistantChat suggestions={suggestions} configured={Boolean(process.env.ANTHROPIC_API_KEY)} />
    </>
  );
}
