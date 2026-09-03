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

import {
  ExpenseWarningsPanel,
  type DisplayWarning,
} from './components/ExpenseWarningsPanel';

import { useExpense } from './api';

export function ExpenseDetailPage() {
  const { expenseId } = useParams<{ expenseId: string }>();

  const expenseQuery = useExpense(expenseId);

  const reportQuery = useReport(expenseQuery.data?.reportId);

  const { user } = useAuth();

  if (expenseQuery.isPending) {
    return <LoadingState label="Cargando gasto…" />;
  }

  if (expenseQuery.isError) {
    return (
      <ErrorState
        error={expenseQuery.error}
        onRetry={() => void expenseQuery.refetch()}
      />
    );
  }

  const expense = expenseQuery.data;

  const report = reportQuery.data;

  const canEdit =
    report !== undefined &&
    report.status === 'DRAFT' &&
    report.owner.id === user?.id;

  const warnings: DisplayWarning[] = expense.warnings.map(
    (warning) => ({
      key: warning.id,
      severity: warning.severity,
      message: warning.message,
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={expense.merchant}
        breadcrumb={[
          { label: 'Gastos', to: '/expenses' },
          ...(report
            ? [
              {
                label: report.title,
                to: `/reports/${report.id}`,
              },
            ]
            : []),
          { label: expense.merchant },
        ]}
        description={
          <span className="flex flex-wrap items-center gap-2 text-[#6b7280]">
            <StatusBadge status={expense.status} />

            <span>{formatDate(expense.expenseDate)}</span>

            {expense.category && (
              <span>· {expense.category.name}</span>
            )}
          </span>
        }
        actions={
          canEdit && (
            <Link
              to={`/reports/${expense.reportId}/expenses/${expense.id}/edit`}
            >
              <Button>Editar gasto</Button>
            </Link>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] lg:col-span-2">
          <CardHeader
            title="Importes guardados"
            description="Estos son los importes oficiales calculados y almacenados por el sistema."
          />

          <CardBody>
            <dl className="divide-y divide-black/[0.05]">
              <Row
                label={
                  expense.tax.included
                    ? 'Importe introducido (bruto)'
                    : 'Importe introducido (neto)'
                }
                value={
                  <MoneyText value={expense.amount} />
                }
              />

              <Row
                label="Neto, sin impuestos"
                value={
                  <MoneyText
                    value={expense.netAmount}
                  />
                }
              />

              <Row
                label={`Impuesto del ${formatRateBps(
                  expense.tax.rateBps
                )} (${expense.tax.included
                    ? 'incluido en el importe'
                    : 'añadido al importe'
                  })`}
                value={
                  <span className="tabular whitespace-nowrap">
                    {expense.tax.display}
                  </span>
                }
              />

              <Row
                label="Total guardado"
                value={
                  <MoneyText
                    value={expense.total}
                    emphasis
                  />
                }
                strong
              />
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-6">
          {/* avisos */}
          <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <CardHeader
              title="Avisos"
              headingLevel={3}
            />

            <CardBody>
              <ExpenseWarningsPanel
                warnings={warnings}
                emptyMessage="No se han generado avisos para este gasto."
              />
            </CardBody>
          </Card>

          {/* Detalles */}
          <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <CardHeader
              title="Detalles"
              headingLevel={3}
            />

            <CardBody>
              <dl className="divide-y divide-black/[0.05] text-sm">
                <Row
                  label="Categoría"
                  value={
                    expense.category?.name ??
                    'Sin categoría'
                  }
                />

                {expense.customFields.map((field) => (
                  <Row
                    key={field.fieldId}
                    label={field.name}
                    value={
                      typeof field.value === 'boolean'
                        ? field.value
                          ? 'Sí'
                          : 'No'
                        : field.value
                    }
                  />
                ))}

                <Row
                  label="Fecha del gasto"
                  value={formatDate(
                    expense.expenseDate
                  )}
                />

                <Row
                  label="Moneda"
                  value={expense.amount.currency}
                />

                <Row
                  label="Creado"
                  value={formatDateTime(
                    expense.createdAt
                  )}
                />

                <Row
                  label="Última actualización"
                  value={formatDateTime(
                    expense.updatedAt
                  )}
                />

                <Row
                  label="Informe"
                  value={
                    report ? (
                      <Link
                        to={`/reports/${report.id}`}
                        className="font-medium text-[#4f46e5] transition-colors hover:text-[#3730a3] hover:underline"
                      >
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
    </div>
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
    <div className="flex flex-wrap items-baseline justify-between gap-3 py-3">
      <dt className="text-sm text-[#7c8798]">
        {label}
      </dt>

      <dd
        className={
          strong
            ? 'text-base font-semibold text-[#111827]'
            : 'text-sm font-medium text-[#202632]'
        }
      >
        {value}
      </dd>
    </div>
  );
}