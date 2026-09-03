import { Link } from 'react-router-dom';

import { Button } from '@/shared/components/Button';

import { Card, CardHeader } from '@/shared/components/Card';

import { MoneyTotals } from '@/shared/components/MoneyText';

import { PageHeader } from '@/shared/components/PageHeader';

import { StatusBadge } from '@/shared/components/Badges';

import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '@/shared/components/States';

import { formatDateTime } from '@/shared/utils/dates';

import { useReports } from '@/features/reports/api';

export function ApprovalInboxPage() {
  // Estedevuelve los informes pendientes de aprobación por el usuario actual
  const pending = useReports({
    pendingMyApproval: true,
  });

  const assigned = useReports({
    role: 'approver',
  });

  const decided = (
    assigned.data?.results ?? []
  ).filter(
    (report) =>
      report.status === 'APPROVED' ||
      report.status === 'REJECTED' ||
      report.status === 'PAID'
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aprobaciones"
        description="Revisa los informes pendientes de tu decisión y consulta el historial de los que ya has gestionado."
      />

      <div className="space-y-6">
        {/* Pendiente de aprobación */}
        <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <CardHeader
            title="Pendientes de tu decisión"
            description="Estos informes están esperando tu aprobación. Si compartes el mismo grupo de aprobación con otra persona, cualquiera de vosotros puede revisarlos primero."
          />

          {pending.isPending && (
            <TableSkeleton columns={5} />
          )}

          {pending.isError && (
            <ErrorState
              error={pending.error}
              onRetry={() =>
                void pending.refetch()
              }
            />
          )}

          {pending.isSuccess &&
            pending.data.results.length === 0 && (
              <EmptyState
                title="No tienes nada pendiente de aprobar"
                description="Cuando un informe llegue a tu paso dentro de la cadena de aprobación, aparecerá aquí."
              />
            )}

          {pending.isSuccess &&
            pending.data.results.length > 0 && (
              <ul className="divide-y divide-black/[0.05]">
                {pending.data.results.map(
                  (report) => (
                    <li
                      key={report.id}
                      className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-[#fafafa]"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/reports/${report.id}`}
                          className="block max-w-[420px] truncate text-sm font-semibold text-[#202632] transition-colors hover:text-[#4f46e5]"
                        >
                          {report.title}
                        </Link>

                        <p className="mt-1 text-xs text-[#8b95a5]">
                          {report.expenseCount}{' '}
                          {report.expenseCount ===
                            1
                            ? 'gasto'
                            : 'gastos'}

                          {report.submittedAt &&
                            ` · enviado ${formatDateTime(
                              report.submittedAt
                            )}`}
                        </p>
                      </div>

                      <div className="font-semibold text-[#111827]">
                        <MoneyTotals
                          totals={report.totals}
                        />
                      </div>

                      <Link
                        to={`/reports/${report.id}`}
                      >
                        <Button size="sm">
                          Revisar
                        </Button>
                      </Link>
                    </li>
                  )
                )}
              </ul>
            )}
        </Card>

        {/* Decisiones historial */}
        <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <CardHeader
            title="Decisiones anteriores"
            description="Informes en los que participaste como aprobador y que ya han alcanzado un estado final."
          />

          {assigned.isPending && (
            <TableSkeleton columns={4} />
          )}

          {assigned.isError && (
            <ErrorState
              error={assigned.error}
              onRetry={() =>
                void assigned.refetch()
              }
            />
          )}

          {assigned.isSuccess &&
            decided.length === 0 && (
              <EmptyState
                title="Todavía no hay decisiones"
                description="Tu historial de aprobaciones aparecerá aquí."
              />
            )}

          {assigned.isSuccess &&
            decided.length > 0 && (
              <ul className="divide-y divide-black/[0.05]">
                {decided.map((report) => (
                  <li
                    key={report.id}
                    className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-[#fafafa]"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/reports/${report.id}`}
                        className="block max-w-[420px] truncate text-sm font-semibold text-[#202632] transition-colors hover:text-[#4f46e5]"
                      >
                        {report.title}
                      </Link>

                      <p className="mt-1 text-xs text-[#8b95a5]">
                        {report.expenseCount}{' '}
                        {report.expenseCount ===
                          1
                          ? 'gasto'
                          : 'gastos'}
                      </p>
                    </div>

                    <StatusBadge
                      status={report.status}
                    />

                    <div className="font-semibold text-[#111827]">
                      <MoneyTotals
                        totals={report.totals}
                        emphasis={false}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </Card>
      </div>
    </div>
  );
}