import { useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button';
import {
  Card,
  CardBody,
  CardHeader,
} from '@/shared/components/Card';

import { Select } from '@/shared/components/Field';
import { StepStatusBadge } from '@/shared/components/Badges';
import {
  AlertBanner,
  EmptyState,
} from '@/shared/components/States';

import { formatDateTime } from '@/shared/utils/dates';
import { toMessage } from '@/shared/api/errors';

import type {
  ApprovalStep,
  ReportDetail,
  User,
} from '@/shared/types/domain';

import { useUsers } from '@/features/catalog/api';
import {
  useApprovalPreview,
  useCreateApprovalStep,
  useDeleteApprovalStep,
} from '../api';

/** Muestra un único aprobador o la lista de posibles aprobadores */
function poolLabel(approvers: User[]) {
  const names = approvers.map(
    (approver) => approver.fullName
  );

  if (names.length === 0) {
    return 'Sin aprobador';
  }

  if (names.length === 1) {
    return names[0];
  }

  return `Cualquiera de: ${names.join(', ')}`;
}

/**
 * Muestra la cadena de aprobación prevista en borrador y la cadena real una vez enviado el informe. Los administradores pueden sustituirla manualmente antes del envío */
export function ApprovalChainEditor({
  report,
  canEdit,
}: {
  report: ReportDetail;
  canEdit: boolean;
}) {
  const steps = [
    ...report.approvalSteps,
  ].sort(
    (left, right) =>
      left.stepOrder - right.stepOrder
  );

  const isDraft =
    report.status === 'DRAFT';

  const hasManualChain = steps.some(
    (step) => step.origin === 'MANUAL'
  );

  const [
    showManualEditor,
    setShowManualEditor,
  ] = useState(hasManualChain);

  const [
    selectedApprover,
    setSelectedApprover,
  ] = useState('');

  const [actionError, setActionError] =
    useState<string | null>(null);

  const previewQuery = useApprovalPreview(
    report.id,
    isDraft
  );

  const createStep =
    useCreateApprovalStep(report.id);

  const deleteStep =
    useDeleteApprovalStep(report.id);

  const usersQuery = useUsers(
    { active: true },
    {
      enabled:
        canEdit && showManualEditor,
    }
  );

  const eligibleApprovers = useMemo(() => {
    const assigned = new Set(
      steps.flatMap((step) =>
        step.approvers.map(
          (user) => user.id
        )
      )
    );

    return (
      usersQuery.data?.results ?? []
    ).filter(
      (user) =>
        user.active &&
        (user.role === 'APPROVER' ||
          user.role === 'ADMIN') &&
        user.id !== report.owner.id &&
        !assigned.has(user.id)
    );
  }, [
    usersQuery.data,
    steps,
    report.owner.id,
  ]);

  const nextStepOrder =
    steps.length + 1;

  async function handleAdd() {
    setActionError(null);

    try {
      await createStep.mutateAsync({
        approverId: selectedApprover,
        stepOrder: nextStepOrder,
      });

      setSelectedApprover('');
    } catch (error) {
      setActionError(toMessage(error));
    }
  }

  async function handleRemove(
    step: ApprovalStep
  ) {
    setActionError(null);

    try {
      await deleteStep.mutateAsync(
        step.id
      );
    } catch (error) {
      setActionError(toMessage(error));
    }
  }

  const preview = previewQuery.data;

  const showPreview =
    isDraft && !hasManualChain;

  return (
    <Card className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <CardHeader
        title="Cadena de aprobación"
        description={
          isDraft
            ? 'Se genera a partir de las reglas de aprobación cuando se envía el informe. Los pasos se resuelven en orden.'
            : 'Los aprobadores deciden en orden. El paso 1 se hace primero.'
        }
      />

      {showPreview &&
        preview?.autoApprove && (
          <div className="px-5 py-4">
            <AlertBanner
              tone="info"
              title="No se necesita aprobación"
            >
              Ninguna regla de aprobación
              coincide con este informe, por
              lo que se aprobará
              automáticamente en cuanto se
              envíe.
            </AlertBanner>
          </div>
        )}

      {showPreview &&
        preview &&
        preview.steps.length > 0 && (
          <>
            <p className="px-5 pt-3 text-xs leading-5 text-[#8b95a5]">
              Vista previa — se volverá a
              calcular cuando se envíe el
              informe, por lo que puede
              cambiar si se modifican los
              gastos o las reglas.
            </p>

            <ol className="divide-y divide-black/[0.05]">
              {preview.steps.map(
                (step) => (
                  <li
                    key={step.ruleId}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-[#fafafa]"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f0efff] text-xs font-semibold text-[#4f46e5]">
                      {step.stepOrder}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#202632]">
                        {poolLabel(
                          step.approvers
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-[#8b95a5]">
                        mediante{' '}
                        {step.ruleName}
                      </p>
                    </div>
                  </li>
                )
              )}
            </ol>
          </>
        )}

      {!showPreview &&
        steps.length === 0 && (
          <EmptyState
            title="No hay aprobadores asignados"
            description="Este informe se aprobó sin pasar por una cadena de aprobación."
          />
        )}

      {!showPreview &&
        steps.length > 0 && (
          <ol className="divide-y divide-black/[0.05]">
            {steps.map((step) => (
              <li
                key={step.id}
                className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-[#fafafa]"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f0efff] text-xs font-semibold text-[#4f46e5]">
                  {step.stepOrder}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#202632]">
                    {poolLabel(
                      step.approvers
                    )}
                  </p>

                  {step.approvers.length ===
                    1 && (
                      <p className="mt-0.5 truncate text-xs text-[#8b95a5]">
                        {
                          step.approvers[0]
                            .email
                        }
                      </p>
                    )}

                  {step.ruleName && (
                    <p className="mt-0.5 text-xs text-[#8b95a5]">
                      mediante{' '}
                      {step.ruleName}
                    </p>
                  )}

                  {step.origin ===
                    'DELEGATED' && (
                      <p className="mt-0.5 text-xs font-medium text-[#4f46e5]">
                        Reasignado a este
                        aprobador
                      </p>
                    )}

                  {step.decidedBy &&
                    step.decidedAt && (
                      <p className="mt-0.5 text-xs text-[#8b95a5]">
                        {
                          step.decidedBy
                            .fullName
                        }{' '}
                        tomó una decisión el{' '}
                        {formatDateTime(
                          step.decidedAt
                        )}
                      </p>
                    )}

                  {step.comment && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[#4b5563]">
                      {step.comment}
                    </p>
                  )}
                </div>

                <StepStatusBadge
                  status={step.status}
                />

                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void handleRemove(
                        step
                      )
                    }
                    isLoading={
                      deleteStep.isPending &&
                      deleteStep.variables ===
                      step.id
                    }
                  >
                    Eliminar
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}

      {/* =====================================================
          ACTIVAR CADENA MANUAL
      ====================================================== */}
      {canEdit &&
        !showManualEditor && (
          <CardBody className="border-t border-black/[0.06] bg-[#fbfbfc]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#6b7280]">
                ¿Necesitas un aprobador
                diferente para este informe?
              </p>

              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setShowManualEditor(true)
                }
              >
                Sustituir por una cadena
                manual
              </Button>
            </div>
          </CardBody>
        )}

      {canEdit &&
        showManualEditor && (
          <CardBody className="border-t border-black/[0.06] bg-[#fbfbfc]">
            {actionError && (
              <div className="mb-3">
                <AlertBanner tone="error">
                  {actionError}
                </AlertBanner>
              </div>
            )}

            <div className="mb-4">
              <AlertBanner tone="warning">
                Una cadena manual sustituye
                completamente las reglas de
                aprobación para este
                informe. Los pasos deben
                ejecutarse en orden 1, 2, 3
                sin saltos y se mantienen
                aunque el informe vuelva a
                borrador.
              </AlertBanner>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Select
                label={`Añadir aprobador como paso ${nextStepOrder}`}
                value={selectedApprover}
                onChange={(event) =>
                  setSelectedApprover(
                    event.target.value
                  )
                }
                className="min-w-56"
                hint="El aprobador debe estar activo, tener el rol de aprobador o administrador y no ser el propietario del informe."
              >
                <option value="">
                  Selecciona un aprobador…
                </option>

                {eligibleApprovers.map(
                  (user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.fullName} (
                      {user.role.toLowerCase()}
                      )
                    </option>
                  )
                )}
              </Select>

              <Button
                onClick={() =>
                  void handleAdd()
                }
                disabled={
                  !selectedApprover
                }
                isLoading={
                  createStep.isPending
                }
              >
                Añadir paso
              </Button>

              {!hasManualChain && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setShowManualEditor(
                      false
                    )
                  }
                >
                  Usar las reglas
                </Button>
              )}
            </div>

            {usersQuery.isSuccess &&
              eligibleApprovers.length ===
              0 && (
                <p className="mt-3 text-sm leading-5 text-[#6b7280]">
                  No hay aprobadores
                  disponibles. Crea un
                  usuario con el rol de
                  aprobador en Ajustes →
                  Usuarios.
                </p>
              )}
          </CardBody>
        )}
    </Card>
  );
}