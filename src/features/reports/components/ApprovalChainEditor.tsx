import { useMemo, useState } from 'react';

import { Button } from '@/shared/components/Button';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Select } from '@/shared/components/Field';
import { StepStatusBadge } from '@/shared/components/Badges';
import { AlertBanner, EmptyState } from '@/shared/components/States';
import { formatDateTime } from '@/shared/utils/dates';
import { toMessage } from '@/shared/api/errors';
import type { ApprovalStep, ReportDetail, User } from '@/shared/types/domain';
import { useUsers } from '@/features/catalog/api';

import { useApprovalPreview, useCreateApprovalStep, useDeleteApprovalStep } from '../api';

/** Muestra un único aprobador o la lista de posibles aprobadores. */
function poolLabel(approvers: User[]) {
  const names = approvers.map((approver) => approver.fullName);
  if (names.length === 0) return 'No approver';
  if (names.length === 1) return names[0];
  return `Any of: ${names.join(', ')}`;
}

/** Muestra la cadena de aprobación prevista en borrador y la cadena real una vez enviado el informe. Los administradores pueden sustituirla manualmente antes del envío. */
export function ApprovalChainEditor({
  report,
  canEdit,
}: {
  report: ReportDetail;
  canEdit: boolean;
}) {
  const steps = [...report.approvalSteps].sort((left, right) => left.stepOrder - right.stepOrder);
  const isDraft = report.status === 'DRAFT';
  const hasManualChain = steps.some((step) => step.origin === 'MANUAL');

  const [showManualEditor, setShowManualEditor] = useState(hasManualChain);
  const [selectedApprover, setSelectedApprover] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const previewQuery = useApprovalPreview(report.id, isDraft);
  const createStep = useCreateApprovalStep(report.id);
  const deleteStep = useDeleteApprovalStep(report.id);

  const usersQuery = useUsers({ active: true }, { enabled: canEdit && showManualEditor });

  const eligibleApprovers = useMemo(() => {
    const assigned = new Set(steps.flatMap((step) => step.approvers.map((user) => user.id)));
    return (usersQuery.data?.results ?? []).filter(
      (user) =>
        user.active &&
        (user.role === 'APPROVER' || user.role === 'ADMIN') &&
        user.id !== report.owner.id &&
        !assigned.has(user.id)
    );
  }, [usersQuery.data, steps, report.owner.id]);

  const nextStepOrder = steps.length + 1;

  async function handleAdd() {
    setActionError(null);
    try {
      await createStep.mutateAsync({ approverId: selectedApprover, stepOrder: nextStepOrder });
      setSelectedApprover('');
    } catch (error) {
      setActionError(toMessage(error));
    }
  }

  async function handleRemove(step: ApprovalStep) {
    setActionError(null);
    try {
      await deleteStep.mutateAsync(step.id);
    } catch (error) {
      setActionError(toMessage(error));
    }
  }

  const preview = previewQuery.data;
  const showPreview = isDraft && !hasManualChain;

  return (
    <Card>
      <CardHeader
        title="Approval chain"
        description={
          isDraft
            ? 'Built from the approval rules when the report is submitted. Steps are decided in order.'
            : 'Approvers decide in order. Step 1 acts first.'
        }
      />

      {showPreview && preview?.autoApprove && (
        <div className="px-4 py-4">
          <AlertBanner tone="info" title="No approval needed">
            No approval rule matches this report, so it will be approved automatically as soon as it
            is submitted.
          </AlertBanner>
        </div>
      )}

      {showPreview && preview && preview.steps.length > 0 && (
        <>
          <p className="px-4 pt-3 text-xs text-slate-500">
            Preview — recalculated when the report is submitted, so it can still change if the
            expenses or the rules do.
          </p>
          <ol className="divide-y divide-slate-100">
            {preview.steps.map((step) => (
              <li key={step.ruleId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                  {step.stepOrder}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{poolLabel(step.approvers)}</p>
                  <p className="text-xs text-slate-500">via {step.ruleName}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {!showPreview && steps.length === 0 && (
        <EmptyState
          title="No approvers assigned"
          description="This report was approved without going through an approval chain."
        />
      )}

      {!showPreview && steps.length > 0 && (
        <ol className="divide-y divide-slate-100">
          {steps.map((step) => (
            <li key={step.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                {step.stepOrder}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{poolLabel(step.approvers)}</p>
                {step.approvers.length === 1 && (
                  <p className="truncate text-xs text-slate-500">{step.approvers[0].email}</p>
                )}
                {step.ruleName && <p className="text-xs text-slate-500">via {step.ruleName}</p>}
                {step.origin === 'DELEGATED' && (
                  <p className="text-xs text-indigo-700">Reassigned to this approver</p>
                )}
                {step.decidedBy && step.decidedAt && (
                  <p className="text-xs text-slate-500">
                    {step.decidedBy.fullName} decided {formatDateTime(step.decidedAt)}
                  </p>
                )}
                {step.comment && (
                  <p className="mt-1 text-sm whitespace-pre-wrap text-slate-700">{step.comment}</p>
                )}
              </div>

              <StepStatusBadge status={step.status} />

              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleRemove(step)}
                  isLoading={deleteStep.isPending && deleteStep.variables === step.id}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}

      {canEdit && !showManualEditor && (
        <CardBody className="border-t border-slate-200 bg-slate-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">Need a different reviewer for this one report?</p>
            <Button variant="secondary" size="sm" onClick={() => setShowManualEditor(true)}>
              Override with a manual chain
            </Button>
          </div>
        </CardBody>
      )}

      {canEdit && showManualEditor && (
        <CardBody className="border-t border-slate-200 bg-slate-50">
          {actionError && (
            <div className="mb-3">
              <AlertBanner tone="error">{actionError}</AlertBanner>
            </div>
          )}

          <div className="mb-3">
            <AlertBanner tone="warning">
              A manual chain replaces the rules for this report entirely. Steps must run 1, 2, 3
              without gaps, and they survive a return to draft.
            </AlertBanner>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Select
              label={`Add approver as step ${nextStepOrder}`}
              value={selectedApprover}
              onChange={(event) => setSelectedApprover(event.target.value)}
              className="min-w-56"
              hint="Approvers must be active, hold the Approver or Admin role, and not own the report."
            >
              <option value="">Select an approver…</option>
              {eligibleApprovers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} ({user.role.toLowerCase()})
                </option>
              ))}
            </Select>

            <Button
              onClick={() => void handleAdd()}
              disabled={!selectedApprover}
              isLoading={createStep.isPending}
            >
              Add step
            </Button>

            {!hasManualChain && (
              <Button variant="ghost" onClick={() => setShowManualEditor(false)}>
                Use the rules instead
              </Button>
            )}
          </div>

          {usersQuery.isSuccess && eligibleApprovers.length === 0 && (
            <p className="mt-3 text-sm text-slate-600">
              No eligible approvers are available. Create a user with the Approver role under
              Settings → Users.
            </p>
          )}
        </CardBody>
      )}
    </Card>
  );
}
