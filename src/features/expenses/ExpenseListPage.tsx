import { useMemo, useState } from 'react';

import { Card } from '@/shared/components/Card';
import { Input, Select } from '@/shared/components/Field';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { PageHeader } from '@/shared/components/PageHeader';
import { Pagination } from '@/shared/components/Pagination';
import { EmptyState, ErrorState, TableSkeleton } from '@/shared/components/States';
import {
  SUPPORTED_CURRENCIES,
  decimalToMinor,
  isValidDecimalString,
  toBigInt,
  type CurrencyCode,
} from '@/shared/money/money';
import {
  EXPENSE_STATUSES,
  type ExpenseListParams,
  type ExpenseOrdering,
  type ExpenseStatus,
} from '@/shared/types/domain';
import { useCategories } from '@/features/catalog/api';

import { ExpenseTable } from './components/ExpenseTable';
import { useExpenses } from './api';

const ORDERING_OPTIONS: Array<{ label: string; value: ExpenseOrdering }> = [
  { label: 'Newest first', value: '-createdAt' },
  { label: 'Oldest first', value: 'createdAt' },
  { label: 'Expense date, newest', value: '-expenseDate' },
  { label: 'Expense date, oldest', value: 'expenseDate' },
  { label: 'Total, highest', value: '-total' },
  { label: 'Total, lowest', value: 'total' },
];

export function ExpenseListPage() {
  const [filters, setFilters] = useState<ExpenseListParams>({ page: 1, ordering: '-createdAt' });

  // Como la API no ofrece estos filtros, se aplican únicamente sobre los resultados ya cargados.
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [warningsOnly, setWarningsOnly] = useState(false);

  const categoriesQuery = useCategories();
  const query = useExpenses(filters);

  function update(patch: Partial<ExpenseListParams>) {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  const currency = (filters.currency ?? 'EUR') as CurrencyCode;

  const visible = useMemo(() => {
    const rows = query.data?.results ?? [];

    return rows.filter((expense) => {
      if (warningsOnly && expense.warnings.length === 0) return false;

      const total = toBigInt(expense.total.minor);

      if (minAmount && isValidDecimalString(minAmount, expense.total.currency)) {
        if (total < decimalToMinor(minAmount, expense.total.currency)) return false;
      }
      if (maxAmount && isValidDecimalString(maxAmount, expense.total.currency)) {
        if (total > decimalToMinor(maxAmount, expense.total.currency)) return false;
      }
      return true;
    });
  }, [query.data, warningsOnly, minAmount, maxAmount]);

  const clientFilterActive = warningsOnly || minAmount !== '' || maxAmount !== '';

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Every expense you can see, across all of your reports and the reports you approve."
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-200 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Merchant contains"
            value={filters.merchant ?? ''}
            onChange={(event) => update({ merchant: event.target.value || undefined })}
            placeholder="Search merchant"
          />

          <Select
            label="Status"
            value={filters.status ?? ''}
            onChange={(event) =>
              update({ status: (event.target.value || undefined) as ExpenseStatus | undefined })
            }
          >
            <option value="">Any status</option>
            {EXPENSE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>

          <Select
            label="Category"
            value={filters.categoryId ?? ''}
            onChange={(event) => update({ categoryId: event.target.value || undefined })}
          >
            <option value="">Any category</option>
            {(categoriesQuery.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <Select
            label="Currency"
            value={filters.currency ?? ''}
            onChange={(event) =>
              update({ currency: (event.target.value || undefined) as CurrencyCode | undefined })
            }
          >
            <option value="">Any currency</option>
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>

          <Input
            label="Date from"
            type="date"
            value={filters.expenseDateFrom ?? ''}
            onChange={(event) => update({ expenseDateFrom: event.target.value || undefined })}
          />

          <Input
            label="Date to"
            type="date"
            value={filters.expenseDateTo ?? ''}
            onChange={(event) => update({ expenseDateTo: event.target.value || undefined })}
          />

          <Select
            label="Sort by"
            value={filters.ordering ?? '-createdAt'}
            onChange={(event) => update({ ordering: event.target.value as ExpenseOrdering })}
          >
            {ORDERING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <fieldset className="grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="px-1 text-xs font-medium text-slate-500">
            Filters applied to this page only (not supported by the API)
          </legend>

          <MoneyInput
            label="Total at least"
            currency={currency}
            value={minAmount}
            onChange={setMinAmount}
            hint="Compared against the total."
          />
          <MoneyInput
            label="Total at most"
            currency={currency}
            value={maxAmount}
            onChange={setMaxAmount}
            hint="Compared against the total."
          />
          <Select
            label="Warnings"
            value={warningsOnly ? 'yes' : ''}
            onChange={(event) => setWarningsOnly(event.target.value === 'yes')}
          >
            <option value="">Any</option>
            <option value="yes">Only expenses with warnings</option>
          </Select>
        </fieldset>

        {query.isPending && <TableSkeleton columns={8} />}

        {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}

        {query.isSuccess && visible.length === 0 && (
          <EmptyState
            title="No expenses match these filters"
            description={
              clientFilterActive
                ? 'Try clearing the page-level filters, or widen the API filters above.'
                : 'Expenses are created inside a draft report. Open a report to add one.'
            }
          />
        )}

        {query.isSuccess && visible.length > 0 && (
          <>
            {clientFilterActive && (
              <p className="border-b border-slate-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                Showing {visible.length} of {query.data.results.length} expenses on this page. The
                amount and warning filters run in the browser, so they do not search other pages.
              </p>
            )}

            <ExpenseTable expenses={visible} caption="All visible expenses" />

            <Pagination
              page={filters.page ?? 1}
              count={query.data.count}
              onPageChange={(page) => update({ page })}
              isFetching={query.isFetching}
            />
          </>
        )}
      </Card>
    </>
  );
}
