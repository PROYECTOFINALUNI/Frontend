import { MoneyMinorText, MoneyText } from '@/shared/components/MoneyText';
import { formatRateBps, type CurrencyCode } from '@/shared/money/money';
import type { ExpensePreview } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

export type LocalCalculation = {
  amountMinor: bigint;
  netMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
};

/** Muestra el desglose del cálculo e indica si los valores son una estimación local, una previsualización del backend o los valores guardados.
 */
export function CalculationPreview({
  local,
  backend,
  currency,
  rateBps,
  taxIncluded,
  isFetchingBackend,
}: {
  local: LocalCalculation | null;
  backend: ExpensePreview | null;
  currency: CurrencyCode;
  rateBps: number;
  taxIncluded: boolean;
  isFetchingBackend: boolean;
}) {
  const source = backend ? 'backend' : local ? 'local' : 'none';

  if (source === 'none') {
    return (
      <div className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500 ring-1 ring-slate-200 ring-inset">
        Enter a valid amount to see the tax and total preview.
      </div>
    );
  }

  const rows: Array<{ label: string; node: React.ReactNode; strong?: boolean }> = backend
    ? [
        {
          label: taxIncluded ? 'Gross amount entered' : 'Net amount entered',
          node: <MoneyText value={backend.amount} />,
        },
        { label: 'Net (excluding tax)', node: <MoneyText value={backend.netAmount} /> },
        {
          label: `Tax (${formatRateBps(backend.tax.rateBps)}, ${backend.tax.included ? 'included' : 'added on top'})`,
          node: <span className="tabular whitespace-nowrap">{backend.tax.display}</span>,
        },
        { label: 'Total', node: <MoneyText value={backend.total} emphasis />, strong: true },
      ]
    : [
        {
          label: taxIncluded ? 'Gross amount entered' : 'Net amount entered',
          node: <MoneyMinorText minor={local!.amountMinor} currency={currency} />,
        },
        {
          label: 'Net (excluding tax)',
          node: <MoneyMinorText minor={local!.netMinor} currency={currency} />,
        },
        {
          label: `Tax (${formatRateBps(rateBps)}, ${taxIncluded ? 'included' : 'added on top'})`,
          node: <MoneyMinorText minor={local!.taxMinor} currency={currency} />,
        },
        {
          label: 'Total',
          node: <MoneyMinorText minor={local!.totalMinor} currency={currency} emphasis />,
          strong: true,
        },
      ];

  return (
    <div className="rounded-md bg-slate-50 ring-1 ring-slate-200 ring-inset">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <p className="text-sm font-semibold text-slate-800">
          {source === 'backend'
            ? 'Preview total (checked by the server)'
            : 'Preview total (local estimate)'}
        </p>
        {isFetchingBackend && (
          <span className="text-xs text-slate-500" role="status">
            Checking with the server…
          </span>
        )}
      </div>

      <dl className="divide-y divide-slate-200">
        {rows.map((row) => (
          <div
            key={row.label}
            className={cn(
              'flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm',
              row.strong && 'bg-white font-semibold'
            )}
          >
            <dt className="text-slate-600">{row.label}</dt>
            <dd className="text-slate-900">{row.node}</dd>
          </div>
        ))}
      </dl>

      <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
        These figures are a preview. The saved values are whatever the backend calculates and stores
        when you save.
      </p>
    </div>
  );
}
