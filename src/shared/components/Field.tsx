import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/shared/utils/cn';
import { describedBy } from '@/shared/utils/aria';

const CONTROL_BASE =
  'block w-full rounded-md border-0 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 ' +
  'focus:ring-2 focus:ring-brand-600 disabled:bg-slate-50 disabled:text-slate-500';

const CONTROL_INVALID = 'ring-red-500 focus:ring-red-600';

/** Agrupa un control con su etiqueta, ayuda opcional y mensaje de error, vinculados mediante `aria-describedby`.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  id?: string;
  error?: string;
  hint?: ReactNode;
};

export function Input({ label, id, error, hint, className, required, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <input
        {...props}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, error, hint)}
        className={cn(CONTROL_BASE, error && CONTROL_INVALID, className)}
      />
    </Field>
  );
}

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string;
  id?: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
};

export function Select({
  label,
  id,
  error,
  hint,
  className,
  required,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <Field label={label} htmlFor={selectId} error={error} hint={hint} required={required}>
      <select
        {...props}
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(selectId, error, hint)}
        className={cn(CONTROL_BASE, 'pr-8', error && CONTROL_INVALID, className)}
      >
        {children}
      </select>
    </Field>
  );
}

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string;
  id?: string;
  error?: string;
  hint?: ReactNode;
};

export function Textarea({ label, id, error, hint, className, required, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <Field label={label} htmlFor={textareaId} error={error} hint={hint} required={required}>
      <textarea
        {...props}
        id={textareaId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(textareaId, error, hint)}
        className={cn(CONTROL_BASE, error && CONTROL_INVALID, className)}
      />
    </Field>
  );
}

export function Checkbox({
  label,
  id,
  hint,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & {
  label: string;
  id?: string;
  hint?: ReactNode;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn('flex items-start gap-2', className)}>
      <input
        {...props}
        id={inputId}
        type="checkbox"
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        className="text-brand-600 focus:ring-brand-600 mt-0.5 size-4 rounded border-slate-300"
      />
      <div>
        <label htmlFor={inputId} className="text-sm font-medium text-slate-800">
          {label}
        </label>
        {hint && (
          <p id={`${inputId}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
