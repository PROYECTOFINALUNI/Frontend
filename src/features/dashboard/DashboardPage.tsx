import { Link } from 'react-router-dom';

import { Button } from '@/shared/components/Button';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { MoneyTotals } from '@/shared/components/MoneyText';
import { PageHeader } from '@/shared/components/PageHeader';
import { SeverityBadge, StatusBadge } from '@/shared/components/Badges';
import { EmptyState, ErrorState, LoadingState } from '@/shared/components/States';
import { highestSeverity } from '@/shared/money/money';
import { formatDateTime } from '@/shared/utils/dates';
import { useExpenses } from '@/features/expenses/api';
import { useReports } from '@/features/reports/api';
import { useAuth } from '@/features/auth/useAuth';

export function DashboardPage() {
  const { user, canApprove, isAdmin } = useAuth();

  const drafts = useReports({ role: 'owner', status: 'DRAFT' });
  const submitted = useReports({ role: 'owner', status: 'SUBMITTED' });
  const pendingApproval = useReports({ pendingMyApproval: true });
  // Los avisos están asociados a los gastos, por lo que se consultan desde los gastos en borrador del usuario.
  const draftExpenses = useExpenses({ status: 'DRAFT', pageSize: 100 });

  const flagged = (draftExpenses.data?.results ?? []).filter(
    (expense) => expense.warnings.length > 0
  );
  const blockingCount = flagged.filter((expense) =>
    expense.warnings.some((warning) => warning.severity === 'BLOCKING')
  ).length;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.fullName.split(' ')[0] ?? 'there'}`}
        description="Draft what you spent, group it into a report, and send it through approval."
        actions={
          <Link to="/reports/new">
            <Button>New report</Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Draft reports"
          value={drafts.data?.count}
          isLoading={drafts.isPending}
          to="/reports?status=DRAFT"
          hint="Still editable"
        />
        <StatCard
          label="Awaiting approval"
          value={submitted.data?.count}
          isLoading={submitted.isPending}
          hint="Submitted by you"
        />
        {canApprove && (
          <StatCard
            label="Waiting on you"
            value={pendingApproval.data?.count}
            isLoading={pendingApproval.isPending}
            to="/approvals"
            hint="You are the current approver"
            emphasis={(pendingApproval.data?.count ?? 0) > 0}
          />
        )}
        <StatCard
          label="Flagged draft expenses"
          value={draftExpenses.isPending ? undefined : flagged.length}
          isLoading={draftExpenses.isPending}
          hint={blockingCount > 0 ? `${blockingCount} blocking submission` : 'Warnings to review'}
          emphasis={blockingCount > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Your draft reports"
            description="Add expenses, then submit for approval."
            actions={
              <Link to="/reports">
                <Button variant="secondary" size="sm">
                  View all
                </Button>
              </Link>
            }
          />

          {drafts.isPending && <LoadingState />}
          {drafts.isError && (
            <ErrorState error={drafts.error} onRetry={() => void drafts.refetch()} />
          )}
          {drafts.isSuccess && drafts.data.results.length === 0 && (
            <EmptyState
              title="No draft reports"
              description="Create a report to start capturing expenses."
              action={
                <Link to="/reports/new">
                  <Button>New report</Button>
                </Link>
              }
            />
          )}
          {drafts.isSuccess && drafts.data.results.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {drafts.data.results.slice(0, 5).map((report) => (
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
                  <MoneyTotals totals={report.totals} emphasis={false} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title={canApprove ? 'Waiting on your decision' : 'Recently submitted'}
            description={
              canApprove
                ? 'Reports where you are the current approver.'
                : 'Reports you have sent for approval.'
            }
          />

          {canApprove ? (
            <>
              {pendingApproval.isPending && <LoadingState />}
              {pendingApproval.isSuccess && pendingApproval.data.results.length === 0 && (
                <EmptyState title="Nothing to approve right now" />
              )}
              {pendingApproval.isSuccess && pendingApproval.data.results.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {pendingApproval.data.results.slice(0, 5).map((report) => (
                    <li key={report.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/reports/${report.id}`}
                          className="text-brand-700 font-medium hover:underline"
                        >
                          {report.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          Submitted {formatDateTime(report.submittedAt)}
                        </p>
                      </div>
                      <Link to={`/reports/${report.id}`}>
                        <Button size="sm">Review</Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              {submitted.isPending && <LoadingState />}
              {submitted.isSuccess && submitted.data.results.length === 0 && (
                <EmptyState title="Nothing submitted yet" />
              )}
              {submitted.isSuccess && submitted.data.results.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {submitted.data.results.slice(0, 5).map((report) => (
                    <li key={report.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/reports/${report.id}`}
                          className="text-brand-700 font-medium hover:underline"
                        >
                          {report.title}
                        </Link>
                      </div>
                      <StatusBadge status={report.status} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Draft expenses needing attention"
            description="Warnings recorded by the backend on your draft expenses."
          />

          {draftExpenses.isPending && <LoadingState />}
          {draftExpenses.isSuccess && flagged.length === 0 && (
            <EmptyState
              title="No warnings on your draft expenses"
              description="Expenses above a configured threshold are flagged here."
            />
          )}
          {draftExpenses.isSuccess && flagged.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {flagged.slice(0, 6).map((expense) => {
                const worst = highestSeverity(expense.warnings);
                return (
                  <li key={expense.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/expenses/${expense.id}`}
                        className="text-brand-700 font-medium hover:underline"
                      >
                        {expense.merchant}
                      </Link>
                      <p className="truncate text-xs text-slate-500">
                        {expense.warnings[0]?.message}
                      </p>
                    </div>
                    {worst && <SeverityBadge severity={worst} />}
                    <span className="tabular text-sm whitespace-nowrap">
                      {expense.total.display}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {isAdmin && (
        <Card className="mt-6">
          <CardHeader
            title="Administration"
            description="The database ships without seed data, so categories, warning rules, and approver accounts must be created here."
          />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <Link to="/settings/categories">
                <Button variant="secondary" size="sm">
                  Categories
                </Button>
              </Link>
              <Link to="/settings/warning-rules">
                <Button variant="secondary" size="sm">
                  Warning rules
                </Button>
              </Link>
              <Link to="/settings/users">
                <Button variant="secondary" size="sm">
                  Users
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
  to,
  isLoading,
  emphasis = false,
}: {
  label: string;
  value: number | undefined;
  hint?: string;
  to?: string;
  isLoading?: boolean;
  emphasis?: boolean;
}) {
  const content = (
    <div
      className={
        'rounded-lg bg-white p-4 shadow-sm ring-1 transition-shadow ' +
        (emphasis ? 'ring-amber-300' : 'ring-slate-200') +
        (to ? ' hover:shadow-md' : '')
      }
    >
      <p className="text-sm text-slate-600">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold text-slate-900">
        {isLoading ? <span className="text-slate-300">—</span> : (value ?? 0)}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );

  return to ? (
    <Link to={to} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
