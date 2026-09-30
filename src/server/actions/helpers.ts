import 'server-only';
import type { z } from 'zod';
import { ForbiddenError } from '@/server/auth/viewer';
import type { ActionState } from './types';

/**
 * FormData → plain object; repeated keys become arrays, empty strings stay
 * empty strings. An exact duplicate of a value already present is ignored:
 * React can append a submit button's name/value in addition to the browser
 * doing so, which would otherwise turn `decision=approved` into an array.
 * Genuine multi-value fields (checkbox lists) always carry distinct values.
 */
export function formToObject(form: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value !== 'string') continue;
    const existing = out[key];
    if (existing === undefined) out[key] = value;
    else if (Array.isArray(existing)) {
      if (!existing.includes(value)) existing.push(value);
    } else if (existing !== value) out[key] = [existing, value];
  }
  return out;
}

export function parseForm<T extends z.ZodType>(
  schema: T,
  form: FormData
): { data: z.infer<T>; error?: undefined } | { data?: undefined; error: ActionState } {
  const result = schema.safeParse(formToObject(form));
  if (result.success) return { data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fieldErrors[key] ??= issue.message;
  }
  return { error: { error: 'Please correct the highlighted fields.', fieldErrors } };
}

/**
 * Wraps an action body: converts authorisation failures and unexpected
 * errors into a safe ActionState (no stack traces or SQL to the browser)
 * while letting Next.js redirect/notFound signals propagate.
 */
export async function guarded(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    if (isNextSignal(error)) throw error;
    console.error('portal action failed', error);
    return { error: 'Something went wrong. Please try again.' };
  }
}

function isNextSignal(error: unknown): boolean {
  const digest = (error as { digest?: unknown })?.digest;
  return typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_HTTP_ERROR') || digest === 'NEXT_NOT_FOUND');
}
