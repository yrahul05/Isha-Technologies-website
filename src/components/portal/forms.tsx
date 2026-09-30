'use client';

import { createContext, use, useActionState, useEffect, useId, useRef, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ActionState } from '@/server/actions/types';

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

const controlClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 ease-out focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50 disabled:text-slate-500 aria-invalid:border-rose-400 aria-invalid:focus:ring-rose-100';

/**
 * Form bound to a server action. Shows the action's error/success message,
 * wires field errors into <Field>s by name, and optionally resets or
 * calls `onSuccess` (e.g. to close a dialog) after a successful submit.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  onSuccess,
  showSuccess = true,
}: {
  action: Action;
  children: ReactNode | ((state: ActionState) => ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (state: ActionState) => void;
  showSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state;
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.(state);
    }
  }, [state, resetOnSuccess, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className={cn('space-y-4', className)} noValidate>
      <FieldErrorsContext value={state.fieldErrors ?? {}}>
        {typeof children === 'function' ? children(state) : children}
      </FieldErrorsContext>
      <FormMessage state={state} showSuccess={showSuccess} />
    </form>
  );
}

const FieldErrorsCtx = createContext<Record<string, string>>({});
function FieldErrorsContext({ value, children }: { value: Record<string, string>; children: ReactNode }) {
  return <FieldErrorsCtx value={value}>{children}</FieldErrorsCtx>;
}

export function FormMessage({ state, showSuccess = true }: { state: ActionState; showSuccess?: boolean }) {
  if (state.error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
      </p>
    );
  }
  if (showSuccess && state.ok && state.message) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.message}
      </p>
    );
  }
  return null;
}

export function Field({
  label,
  name,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  required?: boolean;
  children: (props: { id: string; name: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const errors = use(FieldErrorsCtx);
  const error = errors[name];
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children({ id, name, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export function TextField({ label, name, hint, required, className, ...rest }: InputProps & { label: string; name: string; hint?: ReactNode }) {
  return (
    <Field label={label} name={name} hint={hint} required={required} className={className}>
      {(p) => <input {...p} {...rest} required={required} className={controlClass} />}
    </Field>
  );
}

export function TextAreaField({
  label,
  name,
  hint,
  required,
  className,
  rows = 4,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string; hint?: ReactNode }) {
  return (
    <Field label={label} name={name} hint={hint} required={required} className={className}>
      {(p) => <textarea {...p} {...rest} rows={rows} required={required} className={cn(controlClass, 'resize-y')} />}
    </Field>
  );
}

export function SelectField({
  label,
  name,
  hint,
  required,
  options,
  placeholder,
  className,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  hint?: ReactNode;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Field label={label} name={name} hint={hint} required={required} className={className}>
      {(p) => (
        <select {...p} {...rest} required={required} className={cn(controlClass, 'appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9')} style={{ backgroundImage: CHEVRON }}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export function CheckboxList({
  label,
  name,
  options,
  defaultValues = [],
  hint,
  columns = 2,
}: {
  label: string;
  name: string;
  options: { value: string; label: string; meta?: string }[];
  defaultValues?: string[];
  hint?: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  const errors = use(FieldErrorsCtx);
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold text-slate-700">{label}</legend>
      {options.length === 0 ? (
        <p className="text-xs text-slate-500">Nothing to choose from yet.</p>
      ) : (
        <div className={cn('grid max-h-56 gap-1.5 overflow-y-auto rounded-xl border border-gray-200 p-2', columns === 2 && 'sm:grid-cols-2', columns === 3 && 'sm:grid-cols-3')}>
          {options.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-brand/5">
              <input type="checkbox" name={name} value={o.value} defaultChecked={defaultValues.includes(o.value)} className="h-4 w-4 rounded border-gray-300 accent-[#3478e4]" />
              <span className="min-w-0 truncate">{o.label}</span>
              {o.meta && <span className="ml-auto shrink-0 text-[11px] text-slate-400">{o.meta}</span>}
            </label>
          ))}
        </div>
      )}
      {errors[name] ? <p className="text-xs font-medium text-rose-600">{errors[name]}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </fieldset>
  );
}

export function Toggle({ name, label, description, defaultChecked }: { name: string; label: string; description?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3 hover:border-brand/40">
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} value="on" className="peer sr-only" />
      <span className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  className,
  name,
  value,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'destructive';
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      // Forms with several submit buttons (Approve / Reject, Save draft /
      // Send) need to know which one was used. The submitter's name/value
      // wasn't reliably included in the action's FormData, so record it in
      // a hidden field of the same form before the submit event fires.
      onClick={(e) => {
        if (!name) return;
        const form = e.currentTarget.form;
        if (!form) return;
        let input = form.querySelector<HTMLInputElement>(`input[type="hidden"][data-submitter="${name}"]`);
        if (!input) {
          input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.dataset.submitter = name;
          form.appendChild(input);
        }
        input.value = value ?? '';
      }}
      variant={variant === 'destructive' ? 'destructive' : variant}
      disabled={pending}
      className={cn('h-10 rounded-lg px-4 text-sm', variant === 'destructive' && 'bg-rose-600 hover:bg-rose-700', className)}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? (pendingLabel ?? 'Saving…') : children}
    </Button>
  );
}

export const inputClass = controlClass;
