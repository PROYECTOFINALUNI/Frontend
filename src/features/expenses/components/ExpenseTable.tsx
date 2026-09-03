import { Link } from 'react-router-dom';

import { MoneyText } from '@/shared/components/MoneyText';
import { SeverityBadge, StatusBadge } from '@/shared/components/Badges';
import { formatDate } from '@/shared/utils/dates';
import { formatRateBps, highestSeverity } from '@/shared/money/money';
import type { Expense } from '@/shared/types/domain';

export function ExpenseTable({
  expenses,
  caption,
  renderActions,
  showStatus = true,
}: {
  expenses: Expense[];
  caption: string;
  renderActions?: (expense: Expense) => React.ReactNode;
  showStatus?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
              Comercio
            </th>
            <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
              Fecha
            </th>
            <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
              Categoría
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium text-slate-600">
              Importe
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium text-slate-600">
              Impuesto
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium text-slate-600">
              Total
            </th>
            {showStatus && (
              <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                Estado
              </th>
            )}
            <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
              Avisos
            </th>
            {renderActions && (
              <th scope="col" className="px-4 py-2 text-right font-medium text-slate-600">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {expenses.map((expense) => {
            const worst = highestSeverity(expense.warnings);

            return (
              <tr key={expense.id} className="hover:bg-slate-50">
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  <Link
                    to={`/expenses/${expense.id}`}
                    className="text-brand-700 font-medium hover:underline"
                  >
                    {expense.merchant}
                  </Link>
                </th>
                <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                  {formatDate(expense.expenseDate)}
                </td>
                <td className="px-4 py-2 text-slate-600">{expense.category?.name ?? '—'}</td>
                <td className="px-4 py-2 text-right">
                  <MoneyText value={expense.amount} />
                  <span className="block text-xs text-slate-500">
                    {expense.tax.included ? 'impuesto incluido' : 'impuesto no incluido'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <span className="tabular whitespace-nowrap">{expense.tax.display}</span>
                  <span className="block text-xs text-slate-500">
                    {formatRateBps(expense.tax.rateBps)}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <MoneyText value={expense.total} emphasis />
                </td>
                {showStatus && (
                  <td className="px-4 py-2">
                    <StatusBadge status={expense.status} />
                  </td>
                )}
                <td className="px-4 py-2">
                  {worst ? (
                    <span className="inline-flex items-center gap-1">
                      <SeverityBadge severity={worst} />
                      {expense.warnings.length > 1 && (
                        <span className="text-xs text-slate-500">
                          +{expense.warnings.length - 1}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                {renderActions && (
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">{renderActions(expense)}</div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
