import { useId } from 'react';
import type { ReactNode } from 'react';

import { CURRENCY_MINOR_UNITS, type CurrencyCode } from '@/shared/money/money';
import { describedBy } from '@/shared/utils/aria';
import { cn } from '@/shared/utils/cn';

export type MoneyInputProps = {
  label: string;
  value: string;
  currency: CurrencyCode;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  error?: string;
  hint?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  name?: string;
};

/** Campo de importe que mantiene el valor como texto para evitar pérdidas de precisión. La validación definitiva se realiza al enviar y vuelve a comprobarse en el backend.
 */
export function MoneyInput({
  label,
  value,
  currency,
  onChange,
  onBlur,
  id,
  error,
  hint,
  disabled,
  required,
  name,
}: MoneyInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const fractionDigits = CURRENCY_MINOR_UNITS[currency];

  const defaultHint =
    fractionDigits === 0
      ? `${currency} has no decimal places.`
      : `${currency} supports ${fractionDigits} decimal places.`;
  const resolvedHint = hint ?? defaultHint;

  function handleChange(next: string) {
    // Solo permite dígitos y un separador decimal; las comas se convierten en puntos.
    const normalized = next.replace(/,/g, '.');
    if (normalized === '') {
      onChange('');
      return;
    }
    if (!/^[0-9]*\.?[0-9]*$/.test(normalized)) return;
    if (fractionDigits === 0 && normalized.includes('.')) return;
    onChange(normalized);
  }

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-800">
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>

      <div
        className={cn(
          'flex items-stretch rounded-md bg-white ring-1 ring-slate-300 ring-inset',
          'focus-within:ring-brand-600 focus-within:ring-2',
          error && 'ring-red-500 focus-within:ring-red-600',
          disabled && 'bg-slate-50'
        )}
      >
        <span
          className="flex items-center rounded-l-md border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600"
          aria-hidden="true"
        >
          {currency}
        </span>
        <input
          id={inputId}
          name={name}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          // Se usa texto para conservar el valor exacto introducido, incluidos los ceros finales.
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={fractionDigits === 0 ? '0' : `0.${'0'.repeat(fractionDigits)}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, error, resolvedHint)}
          className="tabular block w-full rounded-r-md border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:text-slate-500"
        />
      </div>

      {resolvedHint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-slate-500">
          {resolvedHint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
