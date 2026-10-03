/** Proposal / contract / renewal vocabularies shared by server actions and UI. */

export const PROPOSAL_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** A proposal the client can still act on. */
export function isOpenProposal(status: string): boolean {
  return status === 'sent' || status === 'viewed';
}

/** Draft proposals are the only editable ones — a sent quote must not change under the client. */
export function isEditableProposal(status: string): boolean {
  return status === 'draft';
}

export const CONTRACT_KINDS = [
  { value: 'msa', label: 'Master services agreement' },
  { value: 'sow', label: 'Statement of work' },
  { value: 'nda', label: 'NDA' },
  { value: 'amc', label: 'Annual maintenance (AMC)' },
  { value: 'subscription', label: 'Subscription / retainer' },
  { value: 'other', label: 'Other' },
] as const;

export const CONTRACT_STATUSES = ['draft', 'active', 'expired', 'terminated', 'renewed'] as const;

export const RENEWAL_KINDS = [
  { value: 'domain', label: 'Domain' },
  { value: 'ssl', label: 'SSL certificate' },
  { value: 'hosting', label: 'Hosting / cloud' },
  { value: 'license', label: 'Software licence' },
  { value: 'amc', label: 'AMC / support' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'other', label: 'Other' },
] as const;

/** Whole days from today (IST date string) to `date`; negative when past. */
export function daysFromToday(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export type Urgency = 'expired' | 'critical' | 'soon' | 'upcoming' | 'later';

/** Renewal urgency bands used by the Renewal Center and reminders. */
export function urgencyOf(daysLeft: number): Urgency {
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 7) return 'critical';
  if (daysLeft <= 30) return 'soon';
  if (daysLeft <= 90) return 'upcoming';
  return 'later';
}
