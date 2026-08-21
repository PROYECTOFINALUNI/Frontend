import { Link, useParams } from 'react-router-dom';

import { Button } from '@/shared/components/Button';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { MoneyText } from '@/shared/components/MoneyText';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatusBadge } from '@/shared/components/Badges';
import { ErrorState, LoadingState } from '@/shared/components/States';
import { formatDate, formatDateTime } from '@/shared/utils/dates';
import { formatRateBps } from '@/shared/money/money';
import { useReport } from '@/features/reports/api';
import { useAuth } from '@/features/auth/useAuth';

import { ExpenseWarningsPanel, type DisplayWarning } from './components/ExpenseWarningsPanel';
import { useExpense } from './api';

export function ExpenseDetailPage() {
  const { expenseId } = useParams<{ expenseId: string }>();
  const expenseQuery = useExpense(expenseId);
  const reportQuery = useReport(expenseQuery.data?.reportId);
  const { user } = useAuth();

  if (expenseQuery.isPending) return <LoadingState label="Loading expense…" />;
  if (expenseQuery.isError) {
    return <ErrorState error={expenseQuery.error} onRetry={() => void expenseQuery.refetch()} />;
  }

  const expense = expenseQuery.data;
  const report = reportQuery.data;
  const canEdit = report !== undefined && report.status === 'DRAFT' && report.owner.id === user?.id;

  const warnings: DisplayWarning[] = expense.warnings.map((warning) => ({
    key: warning.id,
    severity: warning.severity,
    message: warning.message,
  }));

  return (
    <>
      <PageHeader
        title={expense.merchant}
        breadcrumb={[
          { label: 'Expenses', to: '/expenses' },
          ...(report ? [{ label: report.title, to: `/reports/${report.id}` }] : []),
          { label: expense.merchant },
        ]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={expense.status} />
            <span>{formatDate(expense.expenseDate)}</span>
            {expense.category && <span>· {expense.category.name}</span>}
          </span>
        }
        actions={
          canEdit && (
            <Link to={`/reports/${expense.reportId}/expenses/${expense.id}/edit`}>
              <Button>Edit expense</Button>
            </Link>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Saved values"
            description="These are the official amounts calculated and stored by the backend."
          />
          <CardBody>
            <dl className="divide-y divide-slate-100">
              <Row
                label={expense.tax.included ? 'Amount entered (gross)' : 'Amount entered (net)'}
                value={<MoneyText value={expense.amount} />}
              />
              <Row label="Net, excluding tax" value={<MoneyText value={expense.netAmount} />} />
              <Row
                label={`Tax at ${formatRateBps(expense.tax.rateBps)} (${expense.tax.included ? 'included in the amount' : 'added on top'})`}
                value={<span className="tabular whitespace-nowrap">{expense.tax.display}</span>}
              />
              <Row
                label="Saved total"
                value={<MoneyText value={expense.total} emphasis />}
                strong
              />
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Warnings" headingLevel={3} />
            <CardBody>
              <ExpenseWarningsPanel
                warnings={warnings}
                emptyMessage="No warnings were raised for this expense."
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Details" headingLevel={3} />
            <CardBody>
              <dl className="divide-y divide-slate-100 text-sm">
                <Row label="Category" value={expense.category?.name ?? 'No category'} />
                {expense.customFields.map((field) => (
                  <Row
                    key={field.fieldId}
                    label={field.name}
                    value={
                      typeof field.value === 'boolean' ? (field.value ? 'Yes' : 'No') : field.value
                    }
                  />
                ))}
                <Row label="Expense date" value={formatDate(expense.expenseDate)} />
                <Row label="Currency" value={expense.amount.currency} />
                <Row label="Created" value={formatDateTime(expense.createdAt)} />
                <Row label="Last updated" value={formatDateTime(expense.updatedAt)} />
                <Row
                  label="Report"
                  value={
                    report ? (
                      <Link to={`/reports/${report.id}`} className="text-brand-700 hover:underline">
                        {report.title}
                      </Link>
                    ) : (
                      '—'
                    )
                  }
                />
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-2">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className={strong ? 'text-base font-semibold text-slate-900' : 'text-sm text-slate-900'}>
        {value}
      </dd>
    </div>
  );
}
