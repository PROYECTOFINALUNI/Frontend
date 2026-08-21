import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/shared/components/Button';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { MoneyTotals } from '@/shared/components/MoneyText';
import { Modal } from '@/shared/components/Modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatusBadge } from '@/shared/components/Badges';
import { AlertBanner, EmptyState, ErrorState, LoadingState } from '@/shared/components/States';
import { toMessage } from '@/shared/api/errors';
import { formatDateTime } from '@/shared/utils/dates';
import { ExpenseTable } from '@/features/expenses/components/ExpenseTable';
import {
  ExpenseWarningsPanel,
  type DisplayWarning,
} from '@/features/expenses/components/ExpenseWarningsPanel';
import { useDeleteExpense } from '@/features/expenses/api';
import type { Expense, ReportDetail } from '@/shared/types/domain';

import { useDeleteReport, useReport } from './api';
import { ApprovalChainEditor } from './components/ApprovalChainEditor';
import { ApprovalTimeline } from './components/ApprovalTimeline';
import { ReportActions } from './components/ReportActions';
import { useReportPermissions } from './useReportPermissions';

export function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const query = useReport(reportId);

  if (query.isPending) return <LoadingState label="Loading report…" />;
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  return <ReportDetailView report={query.data} />;
}

function ReportDetailView({ report }: { report: ReportDetail }) {
  const navigate = useNavigate();
  const permissions = useReportPermissions(report);
  const deleteExpense = useDeleteExpense(report.id);
  const deleteReport = useDeleteReport();
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const [confirmDeleteReport, setConfirmDeleteReport] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Agrupa los avisos de todos los gastos en un resumen del informe.
  const allWarnings: DisplayWarning[] = report.expenses.flatMap((expense) =>
    expense.warnings.map((warning) => ({
      key: warning.id,
      severity: warning.severity,
      message: `${expense.merchant}: ${warning.message}`,
    }))
  );

  const canDeleteReport =
    (permissions.isOwner || permissions.isAdmin) &&
    report.status === 'DRAFT' &&
    report.submittedAt === null &&
    report.events.length === 0;

  async function handleDeleteExpense() {
    if (!pendingDelete) return;
    setActionError(null);
    try {
      await deleteExpense.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      setActionError(toMessage(error));
    }
  }

  async function handleDeleteReport() {
    setActionError(null);
    try {
      await deleteReport.mutateAsync(report.id);
      navigate('/reports', { replace: true });
    } catch (error) {
      setActionError(toMessage(error));
      setConfirmDeleteReport(false);
    }
  }

  return (
    <>
      <PageHeader
        title={report.title}
        breadcrumb={[{ label: 'Reports', to: '/reports' }, { label: report.title }]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={report.status} />
            <span>
              Owned by {report.owner.fullName} · {report.expenseCount}{' '}
              {report.expenseCount === 1 ? 'expense' : 'expenses'}
            </span>
            {report.submittedAt && <span>· Submitted {formatDateTime(report.submittedAt)}</span>}
          </span>
        }
        actions={
          <>
            {permissions.canEditExpenses && (
              <Link to={`/reports/${report.id}/expenses/new`}>
                <Button>Add expense</Button>
              </Link>
            )}
            {canDeleteReport && (
              <Button variant="secondary" onClick={() => setConfirmDeleteReport(true)}>
                Delete report
              </Button>
            )}
          </>
        }
      />

      {actionError && (
        <div className="mb-4">
          <AlertBanner tone="error">{actionError}</AlertBanner>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Expenses"
              description="Amounts, tax, and totals below are the official values stored by the backend."
              actions={
                <div className="text-right">
                  <p className="text-xs text-slate-500">Report total</p>
                  <MoneyTotals totals={report.totals} />
                </div>
              }
            />

            {report.expenses.length === 0 ? (
              <EmptyState
                title="No expenses yet"
                description={
                  permissions.canEditExpenses
                    ? 'Add the first expense to this draft report.'
                    : 'This report does not contain any expenses.'
                }
                action={
                  permissions.canEditExpenses ? (
                    <Link to={`/reports/${report.id}/expenses/new`}>
                      <Button>Add expense</Button>
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <ExpenseTable
                expenses={report.expenses}
                caption={`Expenses in ${report.title}`}
                showStatus={false}
                renderActions={
                  permissions.canEditExpenses
                    ? (expense) => (
                        <>
                          <Link to={`/reports/${report.id}/expenses/${expense.id}/edit`}>
                            <Button variant="secondary" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDelete(expense)}
                          >
                            Delete
                          </Button>
                        </>
                      )
                    : undefined
                }
              />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Warnings"
              description="Official warnings, re-evaluated by the backend on save and on submission."
            />
            <CardBody>
              <ExpenseWarningsPanel
                warnings={allWarnings}
                emptyMessage="No warnings were raised on this report."
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" description="Immutable audit trail of every decision." />
            <ApprovalTimeline events={report.events} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Actions" />
            <CardBody>
              <ReportActions report={report} />
              {!permissions.canSubmit &&
                !permissions.isCurrentApprover &&
                !permissions.canMarkPaid &&
                !permissions.canReturnToDraft && (
                  <p className="text-sm text-slate-600">
                    No actions are available to you for this report right now.
                  </p>
                )}
            </CardBody>
          </Card>

          <ApprovalChainEditor report={report} canEdit={permissions.canEditChain} />
        </div>
      </div>

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this expense?"
        description={
          pendingDelete
            ? `${pendingDelete.merchant} · ${pendingDelete.total.display}. This cannot be undone.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleDeleteExpense()}
              isLoading={deleteExpense.isPending}
            >
              Delete expense
            </Button>
          </>
        }
      />

      <Modal
        open={confirmDeleteReport}
        onClose={() => setConfirmDeleteReport(false)}
        title="Delete this report?"
        description="The report and all of its expenses will be removed. This cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteReport(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleDeleteReport()}
              isLoading={deleteReport.isPending}
            >
              Delete report
            </Button>
          </>
        }
      />
    </>
  );
}
