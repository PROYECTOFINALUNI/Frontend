import { useState } from 'react';

import { Link } from 'react-router-dom';

import { MoneyTotals } from '@/shared/components/MoneyText';
import { Pagination } from '@/shared/components/Pagination';
import { Select } from '@/shared/components/Field';
import { StatusBadge } from '@/shared/components/Badges';
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '@/shared/components/States';

import { formatDate } from '@/shared/utils/dates';

import {
  REPORT_STATUSES,
  type ReportListParams,
  type ReportStatus,
} from '@/shared/types/domain';

import { useReports } from './api';

export function ReportListPage() {
  const [filters, setFilters] =
    useState<ReportListParams>({
      page: 1,
      pageSize: 10,
    });

  const query = useReports(filters);

  function update(patch: Partial<ReportListParams>) {
    // Al cambiar los filtros, se vuelve a la primera página para evitar resultados vacios
    setFilters((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? 1,
    }));
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[#111318] sm:text-[28px]">
            Informes de gastos
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">
            Gestiona tus informes, consulta su estado y
            filtra rápidamente los que necesites.
          </p>
        </div>

        <Link
          to="/reports/new"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-[#5b50f6] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(79,70,229,0.22)] transition-all hover:bg-[#4f46e5] hover:shadow-[0_5px_14px_rgba(79,70,229,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b50f6] focus-visible:ring-offset-2"
        >
          <PlusIcon />

          Añadir reporte
        </Link>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="border-b border-black/[0.06] bg-[#fbfbfc] px-5 py-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[#111827]">
              Filtrar informes
            </h2>

            <p className="mt-0.5 text-xs text-[#8b95a5]">
              Combina los filtros para encontrar un informe
              más rápido.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Rol"
              value={filters.role ?? ''}
              onChange={(event) =>
                update({
                  role: (
                    event.target.value || undefined
                  ) as ReportListParams['role'],
                })
              }
            >
              <option value="">
                Todos los informes
              </option>

              <option value="owner">
                Informes propios
              </option>

              <option value="approver">
                Informes que apruebo
              </option>
            </Select>

            <Select
              label="Estado"
              value={filters.status ?? ''}
              onChange={(event) =>
                update({
                  status: (
                    event.target.value || undefined
                  ) as ReportStatus | undefined,
                })
              }
            >
              <option value="">
                Cualquier estado
              </option>

              {REPORT_STATUSES.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {getStatusLabel(status)}
                </option>
              ))}
            </Select>

            <Select
              label="Pendiente de mi decisión"
              value={
                filters.pendingMyApproval
                  ? 'true'
                  : ''
              }
              onChange={(event) =>
                update({
                  pendingMyApproval:
                    event.target.value === 'true',
                })
              }
              hint="Informes enviados en los que eres el aprobador actual"
            >
              <option value="">
                Todos
              </option>

              <option value="true">
                Solo pendientes
              </option>
            </Select>
          </div>
        </div>

        {query.isPending && (
          <TableSkeleton columns={6} />
        )}

        {query.isError && (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        )}

        {query.isSuccess &&
          query.data.results.length === 0 && (
            <EmptyState
              title="No hay informes con estos filtros"
              description="Prueba con otros filtros o crea un nuevo informe para empezar a registrar gastos."
              action={
                <Link
                  to="/reports/new"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#5b50f6] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#4f46e5]"
                >
                  <PlusIcon />

                  Añadir reporte
                </Link>
              }
            />
          )}

        {query.isSuccess &&
          query.data.results.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-sm">
                  <caption className="sr-only">
                    Informes de gastos
                  </caption>

                  <thead>
                    <tr className="border-b border-black/[0.06] bg-[#fbfbfc]">
                      <th
                        scope="col"
                        className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                      >
                        Informe
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                      >
                        Estado
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                      >
                        Gastos
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                      >
                        Total
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                      >
                        Enviado
                      </th>

                      <th
                        scope="col"
                        className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                      >
                        Creado
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-black/[0.05]">
                    {query.data.results.map(
                      (report) => (
                        <tr
                          key={report.id}
                          className="transition-colors hover:bg-[#fafafa]"
                        >
                          <th
                            scope="row"
                            className="px-5 py-4 text-left font-normal"
                          >
                            <Link
                              to={`/reports/${report.id}`}
                              className="block max-w-[300px] truncate text-sm font-semibold text-[#202632] transition-colors hover:text-[#4f46e5]"
                            >
                              {report.title}
                            </Link>
                          </th>

                          <td className="px-4 py-4">
                            <StatusBadge
                              status={report.status}
                            />
                          </td>

                          <td className="tabular px-4 py-4 text-right text-sm text-[#697386]">
                            {report.expenseCount}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end font-semibold text-[#111827]">
                              <MoneyTotals
                                totals={
                                  report.totals
                                }
                              />
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-[#7c8798]">
                            {formatDate(
                              report.submittedAt?.slice(
                                0,
                                10
                              )
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-[#7c8798]">
                            {formatDate(
                              report.createdAt.slice(
                                0,
                                10
                              )
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-black/[0.06] bg-[#fbfbfc]">
                <Pagination
                  page={filters.page ?? 1}
                  pageSize={filters.pageSize ?? 10}
                  count={query.data.count}
                  onPageChange={(page) =>
                    update({ page })
                  }
                  isFetching={query.isFetching}
                />
              </div>
            </>
          )}
      </section>
    </div>
  );
}


//NOMBRES DE LOS ESTADOS

function getStatusLabel(
  status: ReportStatus
): string {
  const labels: Partial<
    Record<ReportStatus, string>
  > = {
    DRAFT: 'Borrador',
    SUBMITTED: 'Enviado',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    PAID: 'Pagado',
  };

  // Si el backend añade algún estado nuevo y todavía no lo hemos traducido, se muestra nombre legible

  return (
    labels[status] ??
    status.charAt(0) +
    status.slice(1).toLowerCase()
  );
}

//ICONOS

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M10 4v12M4 10h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
