import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Check, Lock } from 'lucide-react';
import { db } from '@/server/db';
import { clients, projects, taskRequestComments, taskRequests, tasks, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { isUuid, taskRequestScope } from '@/server/scope';
import { Avatar, Badge, KeyValue, PageHeader, Panel } from '@/components/portal/ui';
import { EditRequestButton, RequestCommentForm, ReviewRequestForm, WithdrawRequestButton } from '@/components/portal/requests/RequestForms';
import { requestStage, STAGE_LABELS, STAGE_PIPELINE, STAGE_TONES } from '@/lib/portal/task-requests';
import { fmtDate, fmtDateTime } from '@/lib/portal/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Work request' };

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const requester = alias(users, 'requester');
  const reviewer = alias(users, 'reviewer');
  const assignee = alias(users, 'assignee');
  const [row] = await db
    .select({ r: taskRequests, clientName: clients.companyName, projectName: projects.name, requester: requester.name, reviewer: reviewer.name, task: tasks, assignee: assignee.name })
    .from(taskRequests)
    .innerJoin(clients, eq(clients.id, taskRequests.clientId))
    .leftJoin(projects, eq(projects.id, taskRequests.projectId))
    .leftJoin(requester, eq(requester.id, taskRequests.requestedBy))
    .leftJoin(reviewer, eq(reviewer.id, taskRequests.reviewedBy))
    .leftJoin(tasks, eq(tasks.id, taskRequests.taskId))
    .leftJoin(assignee, eq(assignee.id, tasks.assigneeId))
    .where(and(eq(taskRequests.id, id), taskRequestScope(viewer)));
  // Foreign or unknown ids are indistinguishable (404).
  if (!row) notFound();
  const { r, task } = row;
  const stage = requestStage(r, task);
  const isClient = !viewer.isInternal;
  const canReview = can(viewer, 'task_requests.review') && r.status === 'pending';

  const [comments, clientProjects] = await Promise.all([
    db
      .select({ c: taskRequestComments, author: users.name, authorRole: users.role, avatarKey: users.avatarKey })
      .from(taskRequestComments)
      .leftJoin(users, eq(users.id, taskRequestComments.authorId))
      // Internal notes never leave the server for client viewers.
      .where(and(eq(taskRequestComments.requestId, r.id), isClient ? eq(taskRequestComments.isInternal, false) : undefined))
      .orderBy(asc(taskRequestComments.createdAt)),
    isClient || canReview ? db.select({ id: projects.id, name: projects.name }).from(projects).where(and(eq(projects.clientId, r.clientId), isNull(projects.archivedAt))).orderBy(asc(projects.name)) : Promise.resolve([]),
  ]);

  const stopped = stage === 'rejected' || stage === 'cancelled';
  const reached = STAGE_PIPELINE.indexOf(stage);

  return (
    <>
      <PageHeader
        eyebrow={viewer.isInternal ? `Client request · ${row.clientName}` : 'Work request'}
        title={r.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge tone={STAGE_TONES[stage]}>{STAGE_LABELS[stage]}</Badge>
            <span className="text-sm text-slate-500">
              Submitted {fmtDateTime(r.createdAt)} by {row.requester ?? '—'}
            </span>
          </span>
        }
        actions={
          isClient && r.status === 'pending' ? (
            <>
              <EditRequestButton projects={clientProjects} initial={{ id: r.id, title: r.title, description: r.description, projectId: r.projectId, priority: r.priority, desiredDueDate: r.desiredDueDate }} />
              <WithdrawRequestButton id={r.id} />
            </>
          ) : null
        }
      />

      <Panel className="mb-6">
        {stopped ? (
          <p className={cn('rounded-xl border px-3 py-2.5 text-sm', stage === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-gray-200 bg-slate-50 text-slate-700')}>
            {stage === 'rejected' ? `Declined by Isha Technologies${r.reviewedAt ? ` on ${fmtDate(r.reviewedAt)}` : ''}.` : 'You withdrew this request.'}
            {r.reviewNote && <span className="mt-1 block font-medium">“{r.reviewNote}”</span>}
          </p>
        ) : (
          <ol className="grid gap-3 sm:grid-cols-6" aria-label="Request progress">
            {STAGE_PIPELINE.map((s, i) => {
              const done = i <= reached;
              return (
                <li key={s} className="flex items-center gap-2 sm:flex-col sm:items-start" aria-current={i === reached ? 'step' : undefined}>
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold', done ? 'bg-brand text-white' : 'bg-slate-100 text-slate-400')}>{done ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
                  <span className={cn('text-xs font-medium', i === reached ? 'text-brand' : done ? 'text-slate-700' : 'text-slate-400')}>{STAGE_LABELS[s]}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Panel title="Request">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{r.description}</p>
          </Panel>

          {canReview && (
            <Panel title="Review" description="Approving creates a client-visible task on the chosen project. Assign it from the task afterwards.">
              <ReviewRequestForm id={r.id} projects={clientProjects} defaultProjectId={r.projectId} priority={r.priority} dueDate={r.desiredDueDate} />
            </Panel>
          )}

          <Panel title="Conversation">
            {comments.length === 0 ? (
              <p className="mb-4 text-sm text-slate-500">No messages yet.</p>
            ) : (
              <ul className="mb-5 space-y-4">
                {comments.map(({ c, author, authorRole }) => (
                  <li key={c.id} className={cn('flex gap-3', c.isInternal && 'rounded-xl border border-amber-200 bg-amber-50/60 p-3')}>
                    <Avatar name={author ?? '?'} size="sm" />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">{author ?? 'Former user'}</span>
                        {authorRole && authorRole !== 'client' && <Badge tone="brand">Isha Technologies</Badge>}
                        {c.isInternal && (
                          <Badge tone="amber">
                            <Lock className="h-3 w-3" /> Internal
                          </Badge>
                        )}
                        {fmtDateTime(c.createdAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {r.status !== 'cancelled' && <RequestCommentForm id={r.id} staff={viewer.isInternal} />}
          </Panel>
        </div>

        <Panel title="Details">
          <KeyValue
            items={[
              ...(viewer.isInternal ? [{ label: 'Client', value: row.clientName }] : []),
              { label: 'Project', value: row.projectName ?? 'Not specified' },
              { label: 'Priority', value: <span className="capitalize">{r.priority}</span> },
              { label: 'Needed by', value: r.desiredDueDate ? fmtDate(r.desiredDueDate) : '—' },
              ...(r.reviewedAt ? [{ label: r.status === 'approved' ? 'Approved' : 'Reviewed', value: `${fmtDate(r.reviewedAt)}${row.reviewer && viewer.isInternal ? ` · ${row.reviewer}` : ''}` }] : []),
              ...(task && !task.deletedAt
                ? [
                    { label: 'Task', value: <Link href={`/portal/tasks/${task.id}`} className="font-semibold text-brand">Open task →</Link> },
                    { label: 'Assigned to', value: row.assignee ?? 'Not yet assigned' },
                  ]
                : []),
            ]}
          />
          {r.status === 'approved' && r.reviewNote && <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">“{r.reviewNote}”</p>}
          {isClient && r.status === 'approved' && (
            <p className="mt-4 text-xs text-slate-500">
              Need to change approved work? <Link href={task ? `/portal/change-requests?entity=task&id=${task.id}` : '/portal/change-requests'} className="font-semibold text-brand">Submit a change request</Link>.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
