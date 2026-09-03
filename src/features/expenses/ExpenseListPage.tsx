import { useMemo, useState } from 'react';
import { Card } from '@/shared/components/Card';
import { Input, Select } from '@/shared/components/Field';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { PageHeader } from '@/shared/components/PageHeader';
import { Pagination } from '@/shared/components/Pagination';

import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '@/shared/components/States';

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

const ORDERING_OPTIONS: Array<{
  label: string;
  value: ExpenseOrdering;
}> = [
    {
      label: 'Más recientes primero',
      value: '-createdAt',
    },
    {
      label: 'Más antiguos primero',
      value: 'createdAt',
    },
    {
      label: 'Fecha del gasto, más recientes',
      value: '-expenseDate',
    },
    {
      label: 'Fecha del gasto, más antiguos',
      value: 'expenseDate',
    },
    {
      label: 'Total, de mayor a menor',
      value: '-total',
    },
    {
      label: 'Total, de menor a mayor',
      value: 'total',
    },
  ];

export function ExpenseListPage() {
  const [filters, setFilters] =
    useState<ExpenseListParams>({
      page: 1,
      pageSize: 10,
      ordering: '-createdAt',
    });

  // Como la API no ofrece estos filtros, se aplican sobre los resultados ya cargados
  const [minAmount, setMinAmount] = useState('');

  const [maxAmount, setMaxAmount] = useState('');

  const [warningsOnly, setWarningsOnly] =
    useState(false);

  const categoriesQuery = useCategories();

  const query = useExpenses(filters);

  function update(
    patch: Partial<ExpenseListParams>
  ) {
    // Si cambiamos un filtro volvemos a la primera página para no quedarnos en una página que ya no tenga resultados
    setFilters((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? 1,
    }));
  }

  const currency = (
    filters.currency ?? 'EUR'
  ) as CurrencyCode;

  const visible = useMemo(() => {
    const rows = query.data?.results ?? [];

    return rows.filter((expense) => {
      if (
        warningsOnly &&
        expense.warnings.length === 0
      ) {
        return false;
      }

      const total = toBigInt(
        expense.total.minor
      );

      if (
        minAmount &&
        isValidDecimalString(
          minAmount,
          expense.total.currency
        )
      ) {
        if (
          total <
          decimalToMinor(
            minAmount,
            expense.total.currency
          )
        ) {
          return false;
        }
      }

      if (
        maxAmount &&
        isValidDecimalString(
          maxAmount,
          expense.total.currency
        )
      ) {
        if (
          total >
          decimalToMinor(
            maxAmount,
            expense.total.currency
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    query.data,
    warningsOnly,
    minAmount,
    maxAmount,
  ]);

  const clientFilterActive =
    warningsOnly ||
    minAmount !== '' ||
    maxAmount !== '';

  return (
    <div className="space-y-6">
      {/* cabecera */}
      <PageHeader
        title="Gastos"
        description="Consulta y filtra todos los gastos que puedes ver en tus informes y en los informes que apruebas."
      />

      {/* filtros y listado */}
      <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        {/* filtros que sí los envía la API */}
        <div className="border-b border-black/[0.06] bg-[#fbfbfc] px-5 py-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-[#111827]">
              Filtrar gastos
            </h2>

            <p className="mt-0.5 text-xs text-[#8b95a5]">
              Combina los filtros para localizar más
              fácilmente los gastos que necesites.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Comercio contiene"
              value={filters.merchant ?? ''}
              onChange={(event) =>
                update({
                  merchant:
                    event.target.value ||
                    undefined,
                })
              }
              placeholder="Buscar comercio"
            />

            <Select
              label="Estado"
              value={filters.status ?? ''}
              onChange={(event) =>
                update({
                  status: (
                    event.target.value ||
                    undefined
                  ) as
                    | ExpenseStatus
                    | undefined,
                })
              }
            >
              <option value="">
                Cualquier estado
              </option>

              {EXPENSE_STATUSES.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status.charAt(0) +
                      status
                        .slice(1)
                        .toLowerCase()}
                  </option>
                )
              )}
            </Select>

            <Select
              label="Categoría"
              value={
                filters.categoryId ?? ''
              }
              onChange={(event) =>
                update({
                  categoryId:
                    event.target.value ||
                    undefined,
                })
              }
            >
              <option value="">
                Cualquier categoría
              </option>

              {(categoriesQuery.data ?? []).map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}
            </Select>

            <Select
              label="Moneda"
              value={filters.currency ?? ''}
              onChange={(event) =>
                update({
                  currency: (
                    event.target.value ||
                    undefined
                  ) as
                    | CurrencyCode
                    | undefined,
                })
              }
            >
              <option value="">
                Cualquier moneda
              </option>

              {SUPPORTED_CURRENCIES.map(
                (code) => (
                  <option
                    key={code}
                    value={code}
                  >
                    {code}
                  </option>
                )
              )}
            </Select>

            <Input
              label="Fecha desde"
              type="date"
              value={
                filters.expenseDateFrom ?? ''
              }
              onChange={(event) =>
                update({
                  expenseDateFrom:
                    event.target.value ||
                    undefined,
                })
              }
            />

            <Input
              label="Fecha hasta"
              type="date"
              value={
                filters.expenseDateTo ?? ''
              }
              onChange={(event) =>
                update({
                  expenseDateTo:
                    event.target.value ||
                    undefined,
                })
              }
            />

            <Select
              label="Ordenar por"
              value={
                filters.ordering ??
                '-createdAt'
              }
              onChange={(event) =>
                update({
                  ordering:
                    event.target
                      .value as ExpenseOrdering,
                })
              }
            >
              {ORDERING_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </Select>
          </div>
        </div>

        {/* FILTROS QUE SOLO AFECTAN A LA PÁGINA ACTUAL */}
        <fieldset className="grid gap-3 border-b border-black/[0.06] bg-[#f7f8fa] px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="px-1 text-xs font-medium text-[#8b95a5]">
            Filtros aplicados solo a esta
            página
          </legend>

          <MoneyInput
            label="Total mínimo"
            currency={currency}
            value={minAmount}
            onChange={setMinAmount}
            hint="Se compara con el total del gasto."
          />

          <MoneyInput
            label="Total máximo"
            currency={currency}
            value={maxAmount}
            onChange={setMaxAmount}
            hint="Se compara con el total del gasto."
          />

          <Select
            label="Avisos"
            value={
              warningsOnly ? 'yes' : ''
            }
            onChange={(event) =>
              setWarningsOnly(
                event.target.value === 'yes'
              )
            }
          >
            <option value="">
              Cualquiera
            </option>

            <option value="yes">
              Solo gastos con avisos
            </option>
          </Select>
        </fieldset>

        {query.isPending && (
          <TableSkeleton columns={8} />
        )}

        {query.isError && (
          <ErrorState
            error={query.error}
            onRetry={() =>
              void query.refetch()
            }
          />
        )}

        {query.isSuccess &&
          visible.length === 0 && (
            <EmptyState
              title="No hay gastos que coincidan con estos filtros"
              description={
                clientFilterActive
                  ? 'Prueba a quitar alguno de los filtros aplicados a esta página o amplía los filtros anteriores.'
                  : 'Los gastos se crean dentro de un informe en borrador. Abre un informe para añadir uno.'
              }
            />
          )}

        {/* RESULTADOS*/}
        {query.isSuccess &&
          visible.length > 0 && (
            <>
              {clientFilterActive && (
                <p className="border-b border-[#fde7b0] bg-[#fff9eb] px-5 py-2.5 text-xs leading-5 text-[#9a6700]">
                  Mostrando {visible.length} de{' '}
                  {
                    query.data.results
                      .length
                  }{' '}
                  gastos de esta página. Los
                  filtros de importe y avisos
                  se aplican en el navegador,
                  por lo que no buscan en
                  otras páginas.
                </p>
              )}

              {/* ExpenseTable se mantiene tal cual porque es otro componente. le pasamos los mismos gastos filtrados de antes. */}
              <div className="overflow-x-auto">
                <ExpenseTable
                  expenses={visible}
                  caption="Todos los gastos visibles"
                />
              </div>

              <div className="border-t border-black/[0.06] bg-[#fbfbfc]">
                <Pagination
                  page={filters.page ?? 1}
                  pageSize={filters.pageSize ?? 10}
                  count={query.data.count}
                  onPageChange={(page) =>
                    update({ page })
                  }
                  isFetching={
                    query.isFetching
                  }
                />
              </div>
            </>
          )}
      </Card>
    </div>
  );
}