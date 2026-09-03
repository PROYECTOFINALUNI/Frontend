import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { MoneyTotals } from '@/shared/components/MoneyText';
import { Modal } from '@/shared/components/Modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatusBadge } from '@/shared/components/Badges';

import {
  AlertBanner,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/shared/components/States';

import { toMessage } from '@/shared/api/errors';
import { formatDateTime } from '@/shared/utils/dates';
import { ExpenseTable } from '@/features/expenses/components/ExpenseTable';

import {
  ExpenseWarningsPanel,
  type DisplayWarning,
} from '@/features/expenses/components/ExpenseWarningsPanel';

import { useDeleteExpense } from '@/features/expenses/api';

import type {
  Expense,
  ReportDetail,
} from '@/shared/types/domain';

import {
  useDeleteReport,
  useReport,
} from './api';

import { ApprovalChainEditor } from './components/ApprovalChainEditor';
import { ApprovalTimeline } from './components/ApprovalTimeline';
import { ReportActions } from './components/ReportActions';
import { useReportPermissions } from './useReportPermissions';

export function ReportDetailPage() {
  const { reportId } = useParams<{
    reportId: string;
  }>();

  const query = useReport(reportId);

  if (query.isPending) {
    return (
      <LoadingState label="Cargando informe…" />
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return <ReportDetailView report={query.data} />;
}

function ReportDetailView({
  report,
}: {
  report: ReportDetail;
}) {
  const navigate = useNavigate();

  const permissions =
    useReportPermissions(report);

  const deleteExpense =
    useDeleteExpense(report.id);

  const deleteReport = useDeleteReport();

  const [pendingDelete, setPendingDelete] =
    useState<Expense | null>(null);

  const [
    confirmDeleteReport,
    setConfirmDeleteReport,
  ] = useState(false);

  const [actionError, setActionError] =
    useState<string | null>(null);

  // Agrupa los avisos de todos los gastos en un resumen del informe
  const allWarnings: DisplayWarning[] =
    report.expenses.flatMap((expense) =>
      expense.warnings.map((warning) => ({
        key: warning.id,
        severity: warning.severity,
        message: `${expense.merchant}: ${warning.message}`,
      }))
    );

  const canDeleteReport =
    (permissions.isOwner ||
      permissions.isAdmin) &&
    report.status === 'DRAFT' &&
    report.submittedAt === null &&
    report.events.length === 0;

  async function handleDeleteExpense() {
    if (!pendingDelete) return;

    setActionError(null);

    try {
      await deleteExpense.mutateAsync(
        pendingDelete.id
      );

      setPendingDelete(null);
    } catch (error) {
      setActionError(toMessage(error));
    }
  }

  async function handleDeleteReport() {
    setActionError(null);

    try {
      await deleteReport.mutateAsync(report.id);

      navigate('/reports', {
        replace: true,
      });
    } catch (error) {
      setActionError(toMessage(error));

      setConfirmDeleteReport(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={report.title}
        breadcrumb={[
          {
            label: 'Informes',
            to: '/reports',
          },
          {
            label: report.title,
          },
        ]}
        description={
          <span className="flex flex-wrap items-center gap-2 text-[#6b7280]">
            <StatusBadge
              status={report.status}
            />

            <span>
              Propietario: {report.owner.fullName}
              {' · '}
              {report.expenseCount}{' '}
              {report.expenseCount === 1
                ? 'gasto'
                : 'gastos'}
            </span>

            {report.submittedAt && (
              <span>
                · Enviado{' '}
                {formatDateTime(
                  report.submittedAt
                )}
              </span>
            )}
          </span>
        }
        actions={
          <>
            {permissions.canEditExpenses && (
              <Link
                to={`/reports/${report.id}/expenses/new`}
              >
                <Button>
                  Añadir gasto
                </Button>
              </Link>
            )}

            {canDeleteReport && (
              <Button
                variant="secondary"
                onClick={() =>
                  setConfirmDeleteReport(true)
                }
              >
                Eliminar informe
              </Button>
            )}
          </>
        }
      />

      {/* Errores de accion */}
      {actionError && (
        <div>
          <AlertBanner tone="error">
            {actionError}
          </AlertBanner>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* gastos */}
          <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <CardHeader
              title="Gastos"
              description="Los importes, impuestos y totales que aparecen aquí son los valores oficiales almacenados por el sistema."
              actions={
                <div className="text-right">
                  <p className="text-xs font-medium text-[#8b95a5]">
                    Total del informe
                  </p>

                  <div className="mt-1 text-[#111827]">
                    <MoneyTotals
                      totals={report.totals}
                    />
                  </div>
                </div>
              }
            />

            {report.expenses.length === 0 ? (
              <EmptyState
                title="Aún no hay gastos"
                description={
                  permissions.canEditExpenses
                    ? 'Añade el primer gasto a este informe en borrador.'
                    : 'Este informe no contiene ningún gasto.'
                }
                action={
                  permissions.canEditExpenses ? (
                    <Link
                      to={`/reports/${report.id}/expenses/new`}
                    >
                      <Button>
                        Añadir gasto
                      </Button>
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <ExpenseTable
                expenses={report.expenses}
                caption={`Gastos del informe ${report.title}`}
                showStatus={false}
                renderActions={
                  permissions.canEditExpenses
                    ? (expense) => (
                      <>
                        <Link
                          to={`/reports/${report.id}/expenses/${expense.id}/edit`}
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                          >
                            Editar
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPendingDelete(
                              expense
                            )
                          }
                        >
                          Eliminar
                        </Button>
                      </>
                    )
                    : undefined
                }
              />
            )}
          </Card>

          {/* Avisos */}
          <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <CardHeader
              title="Avisos"
              description="Avisos oficiales que el sistema vuelve a evaluar al guardar el gasto y al enviar el informe."
            />

            <CardBody>
              <ExpenseWarningsPanel
                warnings={allWarnings}
                emptyMessage="No se han generado avisos para este informe."
              />
            </CardBody>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <CardHeader
              title="Actividad"
              description="Historial de todas las decisiones y cambios registrados en el informe."
            />

            <ApprovalTimeline
              events={report.events}
            />
          </Card>
        </div>

        {/* Parte lateral */}
        <div className="space-y-6">
          {/* acciones */}
          <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <CardHeader title="Acciones" />

            <CardBody>
              <ReportActions report={report} />

              {!permissions.canSubmit &&
                !permissions.isCurrentApprover &&
                !permissions.canMarkPaid &&
                !permissions.canReturnToDraft && (
                  <p className="text-sm leading-5 text-[#7c8798]">
                    No hay acciones disponibles para
                    este informe en este momento.
                  </p>
                )}
            </CardBody>
          </Card>

          <ApprovalChainEditor
            report={report}
            canEdit={
              permissions.canEditChain
            }
          />
        </div>
      </div>

      {/* confirmar para eliminar gasto */}
      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="¿Eliminar este gasto?"
        description={
          pendingDelete
            ? `${pendingDelete.merchant} · ${pendingDelete.total.display}. Esta acción no se puede deshacer.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setPendingDelete(null)
              }
            >
              Cancelar
            </Button>

            <Button
              variant="danger"
              onClick={() =>
                void handleDeleteExpense()
              }
              isLoading={
                deleteExpense.isPending
              }
            >
              Eliminar gasto
            </Button>
          </>
        }
      />

      {/* confirmar eliminar informe */}
      <Modal
        open={confirmDeleteReport}
        onClose={() =>
          setConfirmDeleteReport(false)
        }
        title="¿Eliminar este informe?"
        description="El informe y todos sus gastos serán eliminados. Esta acción no se puede deshacer."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setConfirmDeleteReport(false)
              }
            >
              Cancelar
            </Button>

            <Button
              variant="danger"
              onClick={() =>
                void handleDeleteReport()
              }
              isLoading={
                deleteReport.isPending
              }
            >
              Eliminar informe
            </Button>
          </>
        }
      />
    </div>
  );
}