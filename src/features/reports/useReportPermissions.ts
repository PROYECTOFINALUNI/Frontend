import { useAuth } from '@/features/auth/useAuth';
import type { ReportDetail } from '@/shared/types/domain';

/** Determina qué acciones puede realizar el usuario actual. La API valida siempre los permisos de forma independiente. */
export function useReportPermissions(report: ReportDetail) {
  const { user, isAdmin } = useAuth();

  const isOwner = user?.id === report.owner.id;

  const currentStep = [...report.approvalSteps]
    .filter((step) => step.status === 'PENDING')
    .sort((left, right) => left.stepOrder - right.stepOrder)[0];

  // Cualquier usuario incluido en el grupo de aprobadores del paso puede tomar la decisión.
  const isCurrentApprover =
    report.status === 'SUBMITTED' &&
    currentStep !== undefined &&
    currentStep.approvers.some((approver) => approver.id === user?.id) &&
    user?.id !== report.owner.id;

  const blockingWarnings = report.expenses.flatMap((expense) =>
    expense.warnings.filter((warning) => warning.severity === 'BLOCKING')
  );

  return {
    isOwner,
    isAdmin,
    isCurrentApprover,
    currentStep,
    canEditExpenses: isOwner && report.status === 'DRAFT',
    canEditChain: isAdmin && report.status === 'DRAFT',
    canSubmit: (isOwner || isAdmin) && report.status === 'DRAFT',
    canDelegate: (isCurrentApprover || isAdmin) && report.status === 'SUBMITTED',
    canReturnToDraft: (isOwner || isAdmin) && report.status === 'REJECTED',
    canMarkPaid: isAdmin && report.status === 'APPROVED',
    canComment:
      isOwner ||
      isAdmin ||
      report.approvalSteps.some((step) =>
        step.approvers.some((approver) => approver.id === user?.id)
      ),
    blockingWarnings,
    isEmpty: report.expenses.length === 0,
  };
}
