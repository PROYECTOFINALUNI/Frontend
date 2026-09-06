import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/shared/components/PageHeader';

import {
  AlertBanner,
  ErrorState,
  LoadingState,
} from '@/shared/components/States';

import { useReport } from '@/features/reports/api';

import type {
  ExpenseWrite,
  ReportStatus,
} from '@/shared/types/domain';

import { ExpenseForm } from './components/ExpenseForm';

import {
  useCreateExpense,
  useExpense,
  useUpdateExpense,
} from './api';

export function ExpenseFormPage() {
  const { reportId, expenseId } =
    useParams<{
      reportId: string;
      expenseId?: string;
    }>();

  const navigate = useNavigate();

  const reportQuery = useReport(reportId);

  const expenseQuery = useExpense(expenseId);

  const createExpense = useCreateExpense();

  const updateExpense = useUpdateExpense(
    expenseId ?? ''
  );

  const isEditing = Boolean(expenseId);

  if (
    reportQuery.isPending ||
    (isEditing && expenseQuery.isPending)
  ) {
    return <LoadingState label="Cargando…" />;
  }

  if (reportQuery.isError) {
    return (
      <ErrorState
        error={reportQuery.error}
        onRetry={() =>
          void reportQuery.refetch()
        }
      />
    );
  }

  if (isEditing && expenseQuery.isError) {
    return (
      <ErrorState
        error={expenseQuery.error}
        onRetry={() =>
          void expenseQuery.refetch()
        }
      />
    );
  }

  const report = reportQuery.data;

  const expense = expenseQuery.data;

  // La API rechaza la creación o edición de gastos si el informe no está en borrador
  // o no pertenece al usuario, así que se informa aquí antes de que falle con un 409.
  if (report.status !== 'DRAFT') {
    return (
      <>
        <PageHeader
          title={
            isEditing
              ? 'Editar gasto'
              : 'Añadir gasto'
          }
          breadcrumb={[
            {
              label: 'Informes',
              to: '/reports',
            },
            {
              label: report.title,
              to: `/reports/${report.id}`,
            },
            {
              label: isEditing
                ? 'Editar gasto'
                : 'Nuevo gasto',
            },
          ]}
        />

        <AlertBanner
          tone="warning"
          title="Este informe ya no se puede editar"
        >
          Los gastos solo se pueden añadir o
          modificar mientras el informe está en
          borrador. Este informe está{' '}
          {getReportStatusLabel(
            report.status
          ).toLowerCase()}
          .
        </AlertBanner>
      </>
    );
  }

  async function handleSubmit(
    payload: ExpenseWrite
  ) {
    if (isEditing && expenseId) {
      // reportId es inmutable
      const {
        reportId: _ignored,
        ...patch
      } = payload;

      await updateExpense.mutateAsync(
        patch
      );
    } else {
      await createExpense.mutateAsync(
        payload
      );
    }

    navigate(`/reports/${report.id}`);
  }

  return (
    <>
      <PageHeader
        title={
          isEditing
            ? 'Editar gasto'
            : 'Añadir gasto'
        }
        description={
          isEditing
            ? 'Al guardar, el servidor vuelve a calcular los impuestos, el total y los avisos oficiales.'
            : 'La vista previa se actualiza mientras escribes. El servidor calcula los valores que se guardan.'
        }
        breadcrumb={[
          {
            label: 'Informes',
            to: '/reports',
          },
          {
            label: report.title,
            to: `/reports/${report.id}`,
          },
          {
            label: isEditing
              ? 'Editar gasto'
              : 'Nuevo gasto',
          },
        ]}
      />

      <ExpenseForm
        reportId={report.id}
        expense={expense}
        onSubmit={handleSubmit}
        onCancel={() =>
          navigate(
            `/reports/${report.id}`
          )
        }
        submitLabel={
          isEditing
            ? 'Guardar cambios'
            : 'Guardar gasto'
        }
      />
    </>
  );
}

function getReportStatusLabel(
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

  return (
    labels[status] ??
    status.charAt(0) +
      status.slice(1).toLowerCase()
  );
}