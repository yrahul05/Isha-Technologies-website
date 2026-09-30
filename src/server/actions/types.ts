/** Shape returned by every portal server action to `useActionState`. */
export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Optional payload (e.g. a created record id, a one-time link). */
  data?: Record<string, string>;
};

export const initialActionState: ActionState = {};
