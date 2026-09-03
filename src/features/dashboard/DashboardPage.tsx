import type { ReactNode } from 'react';

import { Link } from 'react-router-dom';

import { MoneyTotals } from '@/shared/components/MoneyText';
import { SeverityBadge, StatusBadge } from '@/shared/components/Badges';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/shared/components/States';

import { highestSeverity } from '@/shared/money/money';
import { formatDate } from '@/shared/utils/dates';

import { useExpenses } from '@/features/expenses/api';
import { useReports } from '@/features/reports/api';
import { useAuth } from '@/features/auth/useAuth';

export function DashboardPage() {
  const { canApprove } = useAuth();

  /* Consultas originales del Dashboard. */
  const drafts = useReports({
    role: 'owner',
    status: 'DRAFT',
  });

  const submitted = useReports({
    role: 'owner',
    status: 'SUBMITTED',
  });

  const pendingApproval = useReports({
    pendingMyApproval: true,
  });

  const draftExpenses = useExpenses({
    status: 'DRAFT',
    pageSize: 100,
  });


  const recentReports = useReports({
    page: 1,
  });

  const flagged = (draftExpenses.data?.results ?? []).filter(
    (expense) => expense.warnings.length > 0
  );

  const blockingCount = flagged.filter((expense) =>
    expense.warnings.some(
      (warning) => warning.severity === 'BLOCKING'
    )
  ).length;

  /* Ordenamos los informes recibidos por fecha de creación. */
  const recentItems = [
    ...(recentReports.data?.results ?? []),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  /*
   * Conserva la idea de "Revisar" para informes donde el usuario es el aprobador actual.
   */
  const pendingApprovalIds = new Set(
    (pendingApproval.data?.results ?? []).map(
      (report) => report.id
    )
  );


  const currentPeriod = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const formattedPeriod =
    currentPeriod.charAt(0).toUpperCase() +
    currentPeriod.slice(1);

  return (
    <div className="space-y-8">
      {/* =====================================================
          CABECERA
      ====================================================== */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[#111318] sm:text-[28px]">
            Panel de control
          </h1>

          <p className="mt-1 text-sm text-[#6b7280]">
            {formattedPeriod} · Resumen financiero
          </p>
        </div>

        <Link
          to="/reports/new"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-[#5b50f6] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(79,70,229,0.22)] transition-all hover:bg-[#4f46e5] hover:shadow-[0_5px_14px_rgba(79,70,229,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b50f6] focus-visible:ring-offset-2"
        >
          <PlusIcon />
          Añadir reporte
        </Link>
      </section>

      {/* =====================================================
          MIS GASTOS
      ====================================================== */}
      <section>
        <SectionTitle>Mis gastos</SectionTitle>

        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard
            label="Gastos con avisos"
            value={
              draftExpenses.isPending
                ? undefined
                : flagged.length
            }
            isLoading={draftExpenses.isPending}
            hint={
              blockingCount > 0
                ? `${blockingCount} ${blockingCount === 1
                  ? 'aviso bloquea'
                  : 'avisos bloquean'
                } el envío`
                : 'Avisos para revisar'
            }
            accent="violet"
            icon={<WarningExpenseIcon />}
          />

          <MetricCard
            label="Gastos bloqueados"
            value={
              draftExpenses.isPending
                ? undefined
                : blockingCount
            }
            isLoading={draftExpenses.isPending}
            hint={
              blockingCount > 0
                ? 'Requieren corrección antes de enviar'
                : 'No hay bloqueos actualmente'
            }
            accent="amber"
            icon={<BlockingIcon />}
            emphasis={blockingCount > 0}
          />
        </div>

        {/* El detalle aparece únicamente cuando existen avisos */}
        {draftExpenses.isSuccess &&
          flagged.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">
                    Gastos que requieren atención
                  </h3>

                  <p className="mt-0.5 text-xs text-[#8b95a5]">
                    Avisos detectados en tus gastos en
                    borrador.
                  </p>
                </div>

                <span className="rounded-full bg-[#fff7e6] px-2.5 py-1 text-xs font-medium text-[#b45309]">
                  {flagged.length}{' '}
                  {flagged.length === 1
                    ? 'aviso'
                    : 'avisos'}
                </span>
              </div>

              <ul className="divide-y divide-black/[0.05]">
                {flagged
                  .slice(0, 6)
                  .map((expense) => {
                    const worst = highestSeverity(
                      expense.warnings
                    );

                    return (
                      <li
                        key={expense.id}
                        className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#fafafa]"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/expenses/${expense.id}`}
                            className="font-medium text-[#111827] transition-colors hover:text-[#4f46e5]"
                          >
                            {expense.merchant}
                          </Link>

                          <p className="mt-0.5 truncate text-xs text-[#8b95a5]">
                            {
                              expense.warnings[0]
                                ?.message
                            }
                          </p>
                        </div>

                        {worst && (
                          <SeverityBadge
                            severity={worst}
                          />
                        )}

                        <span className="tabular whitespace-nowrap text-sm font-semibold text-[#111827]">
                          {expense.total.display}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
      </section>

      {/* =====================================================
          INFORMES Y APROBACIONES
      ====================================================== */}
      <section>
        <SectionTitle>
          Informes y aprobaciones
        </SectionTitle>

        <div
          className={`grid gap-4 ${canApprove
            ? 'md:grid-cols-2 xl:grid-cols-3'
            : 'md:grid-cols-2'
            }`}
        >
          <MetricCard
            label="Informes en borrador"
            value={drafts.data?.count}
            isLoading={drafts.isPending}
            hint="Todavía puedes editarlos"
            to="/reports?status=DRAFT"
            accent="emerald"
            icon={<ReportIcon />}
          />

          <MetricCard
            label="En espera de aprobación"
            value={submitted.data?.count}
            isLoading={submitted.isPending}
            hint="Informes enviados por ti"
            accent="sky"
            icon={<SubmittedIcon />}
          />

          {canApprove && (
            <MetricCard
              label="Esperando tu decisión"
              value={pendingApproval.data?.count}
              isLoading={pendingApproval.isPending}
              hint={
                (pendingApproval.data?.count ?? 0) >
                  0
                  ? 'Tienes informes pendientes de revisar'
                  : 'No tienes nada pendiente'
              }
              to="/approvals"
              accent="violet"
              icon={<ApprovalIcon />}
              emphasis={
                (pendingApproval.data?.count ?? 0) >
                0
              }
            />
          )}
        </div>

        {/* En el Dashboard anterior ya se mostraba este error */}
        {drafts.isError && (
          <div className="mt-4">
            <ErrorState
              error={drafts.error}
              onRetry={() => void drafts.refetch()}
            />
          </div>
        )}
      </section>

      {/* =====================================================
          ACTIVIDAD RECIENTE
      ====================================================== */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClockIcon />

            <h2 className="text-[15px] font-semibold text-[#111827]">
              Actividad reciente
            </h2>

            {recentReports.isSuccess && (
              <span className="rounded-full border border-black/[0.06] bg-[#f7f7f8] px-2.5 py-0.5 text-xs font-medium text-[#6b7280]">
                {recentItems.length}{' '}
                {recentItems.length === 1
                  ? 'registro'
                  : 'registros'}
              </span>
            )}
          </div>

          <Link
            to="/reports"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#4f46e5] transition-colors hover:text-[#3730a3]"
          >
            Ver todo
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          {recentReports.isPending && (
            <LoadingState />
          )}

          {recentReports.isError && (
            <ErrorState
              error={recentReports.error}
              onRetry={() =>
                void recentReports.refetch()
              }
            />
          )}

          {recentReports.isSuccess &&
            recentItems.length === 0 && (
              <EmptyState
                title="No hay actividad reciente"
                description="Cuando crees o envíes informes aparecerán aquí."
              />
            )}

          {recentReports.isSuccess &&
            recentItems.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                  <caption className="sr-only">
                    Actividad reciente de informes
                  </caption>

                  <thead>
                    <tr className="border-b border-black/[0.06] bg-[#fbfbfc]">
                      <th
                        scope="col"
                        className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                      >
                        Informe
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                      >
                        Estado
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                      >
                        Gastos
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                      >
                        Total
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa3b2]"
                      >
                        Fecha
                      </th>

                      <th
                        scope="col"
                        aria-label="Acciones"
                        className="w-[90px] px-5 py-3"
                      />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-black/[0.05]">
                    {recentItems.map((report) => {
                      const waitingForMe =
                        pendingApprovalIds.has(
                          report.id
                        );

                      return (
                        <tr
                          key={report.id}
                          className="transition-colors hover:bg-[#fafafa]"
                        >
                          <th
                            scope="row"
                            className="px-5 py-4 text-left font-normal"
                          >
                            <Link
                              to={`/reports/${report.id}`}
                              className="block max-w-[280px] truncate text-sm font-semibold text-[#202632] transition-colors hover:text-[#4f46e5]"
                            >
                              {report.title}
                            </Link>
                          </th>

                          <td className="px-4 py-4">
                            <StatusBadge
                              status={report.status}
                            />
                          </td>

                          <td className="tabular px-4 py-4 text-right text-sm text-[#697386]">
                            {report.expenseCount}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end font-semibold text-[#111827]">
                              <MoneyTotals
                                totals={
                                  report.totals
                                }
                                emphasis={false}
                              />
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-[#7c8798]">
                            {formatDate(
                              report.createdAt.slice(
                                0,
                                10
                              )
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              to={`/reports/${report.id}`}
                              className="text-sm font-medium text-[#4f46e5] transition-colors hover:text-[#3730a3]"
                            >
                              {waitingForMe
                                ? 'Revisar'
                                : 'Abrir'}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   TIPOS
========================================================= */

type MetricCardProps = {
  label: string;
  value: number | undefined;
  hint?: string;
  to?: string;
  isLoading?: boolean;
  emphasis?: boolean;
  accent:
  | 'violet'
  | 'amber'
  | 'emerald'
  | 'sky';
  icon: ReactNode;
};

/* =========================================================
   TARJETA DE MÉTRICA
========================================================= */

function MetricCard({
  label,
  value,
  hint,
  to,
  isLoading,
  emphasis = false,
  accent,
  icon,
}: MetricCardProps) {
  const accents = {
    violet: {
      icon: 'bg-[#eeeaff] text-[#5b50f6]',
      bar: 'bg-[#5b50f6]',
    },

    amber: {
      icon: 'bg-[#fff1c9] text-[#d97706]',
      bar: 'bg-[#d97706]',
    },

    emerald: {
      icon: 'bg-[#e8faf2] text-[#059669]',
      bar: 'bg-[#059669]',
    },

    sky: {
      icon: 'bg-[#e9f6ff] text-[#0284c7]',
      bar: 'bg-[#0284c7]',
    },
  };

  const styles = accents[accent];

  const content = (
    <div
      className={[
        'group relative h-full overflow-hidden rounded-2xl bg-white p-5',
        'border shadow-[0_1px_4px_rgba(0,0,0,0.04)]',
        'transition-all duration-200',
        to
          ? 'hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]'
          : '',
        emphasis
          ? 'border-[#f3c969]'
          : 'border-black/[0.06]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles.icon}`}
        >
          {icon}
        </div>

        {to && (
          <span className="text-xs font-medium text-[#a0a8b5] transition-colors group-hover:text-[#4f46e5]">
            Ver →
          </span>
        )}
      </div>

      <p className="mt-4 text-sm font-medium text-[#697386]">
        {label}
      </p>

      <p className="tabular mt-1 text-[28px] font-bold leading-none tracking-[-0.03em] text-[#111318]">
        {isLoading ? (
          <span className="text-[#d1d5db]">—</span>
        ) : (
          (value ?? 0)
        )}
      </p>

      {/*Para hacer que la barra UI aparezca dinámica */}
      <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-[#eef0f3]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
          style={{
            width:
              !isLoading && (value ?? 0) > 0
                ? `${Math.min((value ?? 0) * 20, 100)}%`
                : '0%',
          }}
        />
      </div>

      {hint && (
        <p className="mt-2 text-xs text-[#929baa]">
          {hint}
        </p>
      )}
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

/* =========================================================
   TÍTULO DE SECCIÓN
========================================================= */

function SectionTitle({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#98a2b3]">
      {children}
    </h2>
  );
}

/* =========================================================
   ICONOS
========================================================= */

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M10 4v12M4 10h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WarningExpenseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M5 7.5h12.5A2.5 2.5 0 0 1 20 10v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M15 13h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BlockingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M12 3.5 21 19H3L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M12 9v4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <circle
        cx="12"
        cy="16.5"
        r=".9"
        fill="currentColor"
      />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M14 3.5V8h4M9 12h6M9 15.5h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SubmittedIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M4 12.5 9 17l11-11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ApprovalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="m8.5 12 2.2 2.2 4.8-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4 text-[#8490a2]"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}