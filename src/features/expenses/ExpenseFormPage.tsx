import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/shared/components/PageHeader';
import { AlertBanner, ErrorState, LoadingState } from '@/shared/components/States';
import { useReport } from '@/features/reports/api';
import type { ExpenseWrite } from '@/shared/types/domain';

import { ExpenseForm } from './components/ExpenseForm';
import { useCreateExpense, useExpense, useUpdateExpense } from './api';

export function ExpenseFormPage() {
  const { reportId, expenseId } = useParams<{ reportId: string; expenseId?: string }>();
  const navigate = useNavigate();

  const reportQuery = useReport(reportId);
  const expenseQuery = useExpense(expenseId);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense(expenseId ?? '');

  const isEditing = Boolean(expenseId);

  if (reportQuery.isPending || (isEditing && expenseQuery.isPending)) {
    return <LoadingState label="Loading…" />;
  }

  if (reportQuery.isError) {
    return <ErrorState error={reportQuery.error} onRetry={() => void reportQuery.refetch()} />;
  }

  if (isEditing && expenseQuery.isError) {
    return <ErrorState error={expenseQuery.error} onRetry={() => void expenseQuery.refetch()} />;
  }

  const report = reportQuery.data;
  const expense = expenseQuery.data;

  // The API refuses expense writes unless the report is a draft owned by the
  // caller, so say so here rather than letting the save fail with a 409.
  if (report.status !== 'DRAFT') {
    return (
      <>
        <PageHeader
          title={isEditing ? 'Edit expense' : 'Add expense'}
          breadcrumb={[
            { label: 'Reports', to: '/reports' },
            { label: report.title, to: `/reports/${report.id}` },
            { label: isEditing ? 'Edit expense' : 'New expense' },
          ]}
        />
        <AlertBanner tone="warning" title="This report is no longer editable">
          Expenses can only be added or changed while the report is a draft. This report is{' '}
          {report.status.toLowerCase()}.
        </AlertBanner>
      </>
    );
  }

  async function handleSubmit(payload: ExpenseWrite) {
    if (isEditing && expenseId) {
      // reportId es inmutable
      const { reportId: _ignored, ...patch } = payload;
      await updateExpense.mutateAsync(patch);
    } else {
      await createExpense.mutateAsync(payload);
    }
    navigate(`/reports/${report.id}`);
  }

  return (
    <>
      <PageHeader
        title={isEditing ? 'Edit expense' : 'Add expense'}
        description={
          isEditing
            ? 'Saving recalculates the official tax, total, and warnings on the server.'
            : 'The preview updates as you type. The backend calculates the values it stores.'
        }
        breadcrumb={[
          { label: 'Reports', to: '/reports' },
          { label: report.title, to: `/reports/${report.id}` },
          { label: isEditing ? 'Edit expense' : 'New expense' },
        ]}
      />

      <ExpenseForm
        reportId={report.id}
        expense={expense}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/reports/${report.id}`)}
        submitLabel={isEditing ? 'Save changes' : 'Save expense'}
      />
    </>
  );
}
