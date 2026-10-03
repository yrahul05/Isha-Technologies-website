import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq } from 'drizzle-orm';
import { ArrowLeft, Eye, Lock, Paperclip } from 'lucide-react';
import { db } from '@/server/db';
import { activities, documents, projects, taskChecklistItems, taskComments, users } from '@/server/db/schema';
import { can, requireViewer } from '@/server/auth/viewer';
import { canEditTask, documentScope, findVisibleTask, isUuid } from '@/server/scope';
import { internalPeople } from '@/server/queries/people';
import { Avatar, Badge, KeyValue, PageHeader, Panel, StatusBadge, Timeline } from '@/components/portal/ui';
import { Checklist, CommentComposer } from '@/components/portal/tasks/TaskInteractive';
import { TaskEditForm } from '@/components/portal/tasks/TaskForm';
import { ArchiveTaskButton, DeleteTaskButton } from '@/components/portal/tasks/TaskLifecycle';
import { DocumentRowList } from '@/components/portal/documents/DocumentRowList';
import { UploadButton } from '@/components/portal/documents/Uploader';
import { fmtDate, fmtDateTime, relativeTime } from '@/lib/portal/format';

export const metadata: Metadata = { title: 'Task' };

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const task = await findVisibleTask(viewer, id);
  if (!task) notFound();

  const [[project], checklist, comments, attachments, history, assignee] = await Promise.all([
    db.select({ id: projects.id, name: projects.name, clientId: projects.clientId }).from(projects).where(eq(projects.id, task.projectId)),
    db.select().from(taskChecklistItems).where(eq(taskChecklistItems.taskId, id)).orderBy(asc(taskChecklistItems.position)),
    db
      .select({ c: taskComments, author: users.name, authorRole: users.role })
      .from(taskComments)
      .leftJoin(users, eq(users.id, taskComments.authorId))
      // Clients never receive internal comments — filtered in SQL, not in the UI.
      .where(and(eq(taskComments.taskId, id), viewer.isInternal ? undefined : eq(taskComments.isInternal, false)))
      .orderBy(asc(taskComments.createdAt)),
    db.select().from(documents).where(and(eq(documents.taskId, id), documentScope(viewer))).orderBy(desc(documents.updatedAt)),
    db
      .select({ a: activities, actor: users.name })
      .from(activities)
      .leftJoin(users, eq(users.id, activities.actorId))
      .where(and(eq(activities.entityType, 'task'), eq(activities.entityId, id), viewer.isInternal ? undefined : eq(activities.visibility, 'client')))
      .orderBy(desc(activities.createdAt))
      .limit(30),
    task.assigneeId ? db.select({ name: users.name }).from(users).where(eq(users.id, task.assigneeId)) : Promise.resolve([]),
  ]);
  const editable = await canEditTask(viewer, task);
  const people = editable ? await internalPeople(viewer) : [];

  return (
    <>
      <Link href="/portal/tasks" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand">
        <ArrowLeft className="h-3.5 w-3.5" /> All tasks
      </Link>
      <PageHeader
        eyebrow={project.name}
        title={task.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            {task.archivedAt && <StatusBadge status="archived" label="Archived" />}
            <StatusBadge status={task.priority} />
            {viewer.isInternal &&
              (task.visibility === 'client' ? (
                <Badge tone="brand">
                  <Eye className="h-3 w-3" /> Shared with client
                </Badge>
              ) : (
                <Badge tone="slate">
                  <Lock className="h-3 w-3" /> Internal
                </Badge>
              ))}
          </span>
        }
        actions={
          can(viewer, 'tasks.manage') ? (
            <>
              {(task.status === 'completed' || task.archivedAt) && <ArchiveTaskButton id={task.id} archived={Boolean(task.archivedAt)} />}
              <DeleteTaskButton id={task.id} />
            </>
          ) : null
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Description">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{task.description || 'No description.'}</p>
          </Panel>
          <Panel title="Checklist">
            <Checklist taskId={id} editable={editable} items={checklist.map((c) => ({ id: c.id, label: c.label, isDone: c.isDone }))} />
          </Panel>
          <Panel
            title="Attachments"
            action={viewer.isInternal || task.visibility === 'client' ? <UploadButton target={{ taskId: id, projectId: project.id }} label="Attach file" compact /> : null}
          >
            {attachments.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Paperclip className="h-4 w-4" /> No attachments.
              </p>
            ) : (
              <DocumentRowList docs={attachments} showVisibility={viewer.isInternal} />
            )}
          </Panel>
          <Panel title="Comments" description={`${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}>
            <ul className="mb-5 space-y-4">
              {comments.map(({ c, author, authorRole }) => (
                <li key={c.id} className="flex gap-3">
                  <Avatar name={author ?? '?'} size="sm" />
                  <div className={c.isInternal ? 'min-w-0 flex-1 rounded-xl border border-amber-200 bg-amber-50/60 p-3' : 'min-w-0 flex-1 rounded-xl border border-gray-100 bg-slate-50/60 p-3'}>
                    <p className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-900">{author ?? 'Former user'}</span>
                      {authorRole === 'client' && <Badge tone="brand">Client</Badge>}
                      {c.isInternal && (
                        <Badge tone="amber">
                          <Lock className="h-3 w-3" /> Internal
                        </Badge>
                      )}
                      <span className="text-slate-400">{relativeTime(c.createdAt)}</span>
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
                  </div>
                </li>
              ))}
              {comments.length === 0 && <li className="text-sm text-slate-500">No comments yet.</li>}
            </ul>
            <CommentComposer taskId={id} isInternalUser={viewer.isInternal} taskIsInternal={task.visibility === 'internal'} />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title={editable ? 'Details' : 'Details'}>
            {editable ? (
              <TaskEditForm
                people={people}
                task={{
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  status: task.status,
                  priority: task.priority,
                  assigneeId: task.assigneeId,
                  dueDate: task.dueDate,
                  visibility: task.visibility,
                  estimateHours: task.estimateHours,
                }}
              />
            ) : (
              <KeyValue
                items={[
                  { label: 'Assignee', value: assignee[0]?.name ?? 'Unassigned' },
                  { label: 'Due date', value: fmtDate(task.dueDate) },
                  { label: 'Project', value: <Link href={`/portal/projects/${project.id}`} className="text-brand hover:underline">{project.name}</Link> },
                  { label: 'Completed', value: task.completedAt ? fmtDateTime(task.completedAt) : null },
                ]}
              />
            )}
          </Panel>
          <Panel title="Activity history">
            <Timeline items={history.map((h) => ({ id: h.a.id, title: h.a.summary, meta: `${h.actor ?? 'System'} · ${fmtDateTime(h.a.createdAt)}` }))} />
          </Panel>
        </div>
      </div>
    </>
  );
}
