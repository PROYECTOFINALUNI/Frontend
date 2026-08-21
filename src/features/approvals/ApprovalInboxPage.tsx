import { Link } from 'react-router-dom';

import { Button } from '@/shared/components/Button';
import { Card, CardHeader } from '@/shared/components/Card';
import { MoneyTotals } from '@/shared/components/MoneyText';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatusBadge } from '@/shared/components/Badges';
import { EmptyState, ErrorState, TableSkeleton } from '@/shared/components/States';
import { formatDateTime } from '@/shared/utils/dates';
import { useReports } from '@/features/reports/api';

export function ApprovalInboxPage() {
  // `pendingMyApproval` devuelve los informes pendientes de aprobación por el usuario actual.
  const pending = useReports({ pendingMyApproval: true });
  const assigned = useReports({ role: 'approver' });

  const decided = (assigned.data?.results ?? []).filter(
    (report) =>
      report.status === 'APPROVED' || report.status === 'REJECTED' || report.status === 'PAID'
  );

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Reports waiting on your decision, in the order the approval chain defines."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Awaiting your decision"
            description="You can decide these. A colleague in the same approver pool may get there first."
          />

          {pending.isPending && <TableSkeleton columns={5} />}

          {pending.isError && (
            <ErrorState error={pending.error} onRetry={() => void pending.refetch()} />
          )}

          {pending.isSuccess && pending.data.results.length === 0 && (
            <EmptyState
              title="Nothing to approve"
              description="When a report reaches your step in an approval chain, it appears here."
            />
          )}

          {pending.isSuccess && pending.data.results.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {pending.data.results.map((report) => (
                <li
                  key={report.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/reports/${report.id}`}
                      className="text-brand-700 font-medium hover:underline"
                    >
                      {report.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {report.expenseCount} {report.expenseCount === 1 ? 'expense' : 'expenses'}
                      {report.submittedAt && ` · submitted ${formatDateTime(report.submittedAt)}`}
                    </p>
                  </div>

                  <MoneyTotals totals={report.totals} />

                  <Link to={`/reports/${report.id}`}>
                    <Button size="sm">Review</Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Already decided"
            description="Reports you were an approver on that have reached a final state."
          />

          {assigned.isPending && <TableSkeleton columns={4} />}

          {assigned.isError && (
            <ErrorState error={assigned.error} onRetry={() => void assigned.refetch()} />
          )}

          {assigned.isSuccess && decided.length === 0 && (
            <EmptyState
              title="No decisions yet"
              description="Your approval history appears here."
            />
          )}

          {assigned.isSuccess && decided.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {decided.map((report) => (
                <li key={report.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/reports/${report.id}`}
                      className="text-brand-700 font-medium hover:underline"
                    >
                      {report.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {report.expenseCount} {report.expenseCount === 1 ? 'expense' : 'expenses'}
                    </p>
                  </div>
                  <StatusBadge status={report.status} />
                  <MoneyTotals totals={report.totals} emphasis={false} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
