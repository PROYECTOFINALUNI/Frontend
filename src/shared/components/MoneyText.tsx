import type { Money } from '@/shared/types/domain';
import { formatDisplay, type CurrencyCode } from '@/shared/money/money';
import { cn } from '@/shared/utils/cn';

/** Muestra el valor monetario usando preferentemente el formato proporcionado por el backend. El formato local se utiliza solo como alternativa para valores aún no calculados por el servidor.
 */
export function MoneyText({
  value,
  className,
  emphasis = false,
}: {
  value: Money | null | undefined;
  className?: string;
  emphasis?: boolean;
}) {
  if (!value) {
    return <span className={cn('tabular text-slate-400', className)}>—</span>;
  }

  return (
    <span className={cn('tabular whitespace-nowrap', emphasis && 'font-semibold', className)}>
      {value.display || formatDisplay(value.minor, value.currency)}
    </span>
  );
}

/** Para previsualizaciones calculadas localmente a partir de unidades monetarias mínimas. */
export function MoneyMinorText({
  minor,
  currency,
  className,
  emphasis = false,
}: {
  minor: bigint | string;
  currency: CurrencyCode;
  className?: string;
  emphasis?: boolean;
}) {
  return (
    <span className={cn('tabular whitespace-nowrap', emphasis && 'font-semibold', className)}>
      {formatDisplay(minor, currency)}
    </span>
  );
}

/** Un informe puede incluir distintas monedas, por lo que los totales se muestran por cada moneda. */
export function MoneyTotals({
  totals,
  className,
  emphasis = true,
}: {
  totals: Money[];
  className?: string;
  emphasis?: boolean;
}) {
  if (totals.length === 0) {
    return <span className={cn('tabular text-slate-400', className)}>—</span>;
  }

  return (
    <span className={cn('inline-flex flex-wrap gap-x-2 gap-y-0.5', className)}>
      {totals.map((total) => (
        <MoneyText key={total.currency} value={total} emphasis={emphasis} />
      ))}
    </span>
  );
}
