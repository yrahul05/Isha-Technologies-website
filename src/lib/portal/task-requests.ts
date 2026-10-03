/**
 * The status a client sees for a work request, derived from the request
 * and (once approved) the task it became — never stored, never stale.
 */
export type ClientRequestStage = 'submitted' | 'pending_approval' | 'approved' | 'assigned' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';

export const STAGE_LABELS: Record<ClientRequestStage, string> = {
  submitted: 'Request submitted',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  assigned: 'Assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Withdrawn',
};

/** Ordered pipeline shown as a stepper (rejection/withdrawal end it early). */
export const STAGE_PIPELINE: ClientRequestStage[] = ['submitted', 'pending_approval', 'approved', 'assigned', 'in_progress', 'completed'];

export function requestStage(
  req: { status: string },
  task: { status: string; assigneeId: string | null; deletedAt?: Date | null } | null
): ClientRequestStage {
  if (req.status === 'rejected') return 'rejected';
  if (req.status === 'cancelled') return 'cancelled';
  if (req.status === 'pending') return 'pending_approval';
  if (!task || task.deletedAt) return 'approved';
  if (task.status === 'completed') return 'completed';
  if (task.status === 'in_progress' || task.status === 'review' || task.status === 'blocked') return 'in_progress';
  return task.assigneeId ? 'assigned' : 'approved';
}

export const STAGE_TONES: Record<ClientRequestStage, 'slate' | 'amber' | 'sky' | 'brand' | 'violet' | 'green' | 'red'> = {
  submitted: 'slate',
  pending_approval: 'amber',
  approved: 'sky',
  assigned: 'brand',
  in_progress: 'violet',
  completed: 'green',
  rejected: 'red',
  cancelled: 'slate',
};
