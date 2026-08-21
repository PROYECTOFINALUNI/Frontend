import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { MoneyTotals } from '@/shared/components/MoneyText';
import { PageHeader } from '@/shared/components/PageHeader';
import { Pagination } from '@/shared/components/Pagination';
import { Select } from '@/shared/components/Field';
import { StatusBadge } from '@/shared/components/Badges';
import { EmptyState, ErrorState, TableSkeleton } from '@/shared/components/States';
import { formatDate } from '@/shared/utils/dates';
import { REPORT_STATUSES, type ReportListParams, type ReportStatus } from '@/shared/types/domain';

import { useReports } from './api';

export function ReportListPage() {
  const [filters, setFilters] = useState<ReportListParams>({ page: 1 });
  const query = useReports(filters);

  function update(patch: Partial<ReportListParams>) {
// Al cambiar los filtros, se vuelve a la primera página para evitar resultados vacíos.
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  return (
    <>
      <PageHeader
        title="Expense reports"
        description="Expenses live inside a report. Create a draft report first, then add expenses to it."
        actions={
          <Link to="/reports/new">
            <Button>New report</Button>
          </Link>
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-200 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Role"
            value={filters.role ?? ''}
            onChange={(event) =>
              update({ role: (event.target.value || undefined) as ReportListParams['role'] })
            }
          >
            <option value="">All reports I can see</option>
            <option value="owner">Reports I own</option>
            <option value="approver">Reports I approve</option>
          </Select>

          <Select
            label="Status"
            value={filters.status ?? ''}
            onChange={(event) =>
              update({ status: (event.target.value || undefined) as ReportStatus | undefined })
            }
          >
            <option value="">Any status</option>
            {REPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>

          <Select
            label="Awaiting my decision"
            value={filters.pendingMyApproval ? 'true' : ''}
            onChange={(event) => update({ pendingMyApproval: event.target.value === 'true' })}
            hint="Submitted reports where you are the current approver"
          >
            <option value="">No</option>
            <option value="true">Yes</option>
          </Select>
        </div>

        {query.isPending && <TableSkeleton columns={6} />}

        {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}

        {query.isSuccess && query.data.results.length === 0 && (
          <EmptyState
            title="No reports match these filters"
            description="Create a draft report to start capturing expenses, or clear the filters above."
            action={
              <Link to="/reports/new">
                <Button>New report</Button>
              </Link>
            }
          />
        )}

        {query.isSuccess && query.data.results.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <caption className="sr-only">Expense reports</caption>
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                      Title
                    </th>
                    <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium text-slate-600">
                      Expenses
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium text-slate-600">
                      Total
                    </th>
                    <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                      Submitted
                    </th>
                    <th scope="col" className="px-4 py-2 text-left font-medium text-slate-600">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {query.data.results.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50">
                      <th scope="row" className="px-4 py-2 text-left font-normal">
                        <Link
                          to={`/reports/${report.id}`}
                          className="text-brand-700 font-medium hover:underline"
                        >
                          {report.title}
                        </Link>
                      </th>
                      <td className="px-4 py-2">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="tabular px-4 py-2 text-right">{report.expenseCount}</td>
                      <td className="px-4 py-2 text-right">
                        <MoneyTotals totals={report.totals} />
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {formatDate(report.submittedAt?.slice(0, 10))}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {formatDate(report.createdAt.slice(0, 10))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
