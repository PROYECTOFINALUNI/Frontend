import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { Select, Textarea } from '@/shared/components/Field';
import { AlertBanner } from '@/shared/components/States';
import { ApiError, extractFormErrors, toMessage } from '@/shared/api/errors';
import { hasBlockingWarning } from '@/shared/money/money';
import {
  commentSchema,
  delegateSchema,
  rejectSchema,
  type CommentFormValues,
  type DelegateFormValues,
} from '@/shared/validation/schemas';
import type { ReportDetail } from '@/shared/types/domain';
import { useAuth } from '@/features/auth/useAuth';
import { useUsers } from '@/features/catalog/api';

import { useDelegateApproval, useReportWorkflow, type WorkflowAction } from '../api';
import { useReportPermissions } from '../useReportPermissions';

export function ReportActions({ report }: { report: ReportDetail }) {
  const permissions = useReportPermissions(report);
  const workflow = useReportWorkflow(report.id);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState<'reject' | 'comment' | 'delegate' | null>(null);

  async function run(action: WorkflowAction, comment?: string) {
    setActionError(null);
    try {
      await workflow.mutateAsync({ action, comment });
      setOpenModal(null);
      return true;
    } catch (error) {
// Los conflictos muestran un mensaje específico y actualizan el informe con su estado real.
      setActionError(toMessage(error));
      if (error instanceof ApiError && error.isConflict) {
        return false;
      }
      return false;
    }
  }

// Los aprobadores se asignan al enviar el informe, por lo que la cadena no bloquea el envío.
  const submitBlockedReason = permissions.isEmpty
    ? 'Add at least one expense before submitting.'
    : hasBlockingWarning(permissions.blockingWarnings)
      ? 'Resolve the blocking warnings on the flagged expenses first.'
      : null;

  const anyAction =
    permissions.canSubmit ||
    permissions.isCurrentApprover ||
    permissions.canDelegate ||
    permissions.canReturnToDraft ||
    permissions.canMarkPaid ||
    permissions.canComment;

  if (!anyAction) return null;

  return (
    <div className="space-y-3">
      {actionError && <AlertBanner tone="error">{actionError}</AlertBanner>}

      {permissions.canSubmit && submitBlockedReason && (
        <AlertBanner tone="warning" title="Not ready to submit">
          {submitBlockedReason}
        </AlertBanner>
      )}

      <div className="flex flex-wrap gap-2">
        {permissions.canSubmit && (
          <Button
            onClick={() => void run('submit')}
            isLoading={workflow.isPending && workflow.variables?.action === 'submit'}
            disabled={submitBlockedReason !== null}
          >
            Submit for approval
          </Button>
        )}

        {permissions.isCurrentApprover && (
          <>
            <Button
              onClick={() => void run('approve')}
              isLoading={workflow.isPending && workflow.variables?.action === 'approve'}
            >
              Approve report
            </Button>
            <Button variant="danger" onClick={() => setOpenModal('reject')}>
              Reject report
            </Button>
          </>
        )}

        {permissions.canDelegate && (
          <Button variant="secondary" onClick={() => setOpenModal('delegate')}>
            Reassign to another approver
          </Button>
        )}

        {permissions.canReturnToDraft && (
          <Button
            variant="secondary"
            onClick={() => void run('return-to-draft')}
            isLoading={workflow.isPending && workflow.variables?.action === 'return-to-draft'}
          >
            Return to draft
          </Button>
        )}

        {permissions.canMarkPaid && (
          <Button
            onClick={() => void run('mark-paid')}
            isLoading={workflow.isPending && workflow.variables?.action === 'mark-paid'}
          >
            Mark as paid
          </Button>
        )}

        {permissions.canComment && (
          <Button variant="secondary" onClick={() => setOpenModal('comment')}>
            Add comment
          </Button>
        )}
      </div>

      <RejectDialog
        open={openModal === 'reject'}
        onClose={() => setOpenModal(null)}
        onSubmit={(comment) => run('reject', comment)}
      />

      <CommentDialog
        open={openModal === 'comment'}
        onClose={() => setOpenModal(null)}
        onSubmit={(comment) => run('comment', comment)}
      />

      <DelegateDialog
        report={report}
        open={openModal === 'delegate'}
        onClose={() => setOpenModal(null)}
      />
    </div>
  );
}

/** Sustituye los aprobadores del paso actual por un único aprobador seleccionado. */
function DelegateDialog({
  report,
  open,
  onClose,
}: {
  report: ReportDetail;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const delegate = useDelegateApproval(report.id);
  const [formError, setFormError] = useState<string | null>(null);

// Los aprobadores solo ven otros aprobadores disponibles; los administradores pueden ver a todos los usuarios.
  const usersQuery = useUsers({ active: true }, { enabled: open });

  const candidates = (usersQuery.data?.results ?? []).filter(
    (candidate) =>
      candidate.active &&
      (candidate.role === 'APPROVER' || candidate.role === 'ADMIN') &&
      candidate.id !== report.owner.id &&
      candidate.id !== user?.id
  );

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DelegateFormValues>({
    resolver: zodResolver(delegateSchema),
    defaultValues: { approverId: '', comment: '' },
  });

  function close() {
    setFormError(null);
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Reassign this approval"
      description="The chosen approver replaces everyone currently able to decide this step. The rest of the chain is untouched."
    >
      <form
        onSubmit={handleSubmit(async (values) => {
          setFormError(null);
          try {
            await delegate.mutateAsync({
              approverId: values.approverId,
              comment: values.comment || undefined,
            });
            reset();
            onClose();
          } catch (error) {
            const { fieldErrors, formError: message } = extractFormErrors(error);
            if (fieldErrors.approverId) {
              setError('approverId', { type: 'server', message: fieldErrors.approverId });
            }
            setFormError(message);
          }
        })}
        noValidate
        className="space-y-4"
      >
        {formError && <AlertBanner tone="error">{formError}</AlertBanner>}

        <Select
          label="New approver"
          required
          autoFocus
          error={errors.approverId?.message}
          hint="Any active approver or admin who does not own the report."
          {...register('approverId')}
        >
          <option value="">Select an approver…</option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.fullName} ({candidate.role.toLowerCase()})
            </option>
          ))}
        </Select>

        {candidates.length === 0 && (
          <AlertBanner tone="warning">
            There is nobody else to reassign this to.
          </AlertBanner>
        )}

        <Textarea
          label="Comment"
          rows={3}
          hint="Optional. Recorded in the audit trail alongside the reassignment."
          error={errors.comment?.message}
          {...register('comment')}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Reassign
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** El rechazo requiere un comentario que no esté vacío. */
function RejectDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<boolean>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { comment: '' },
  });

  function close() {
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Reject this report"
      description="The comment is recorded in the audit trail and shown to the report owner."
    >
      <form
        id="reject-report-form"
        onSubmit={handleSubmit(async (values) => {
          const ok = await onSubmit(values.comment);
          if (ok) reset();
        })}
        noValidate
        className="space-y-4"
      >
        <Textarea
          label="Reason for rejection"
          rows={4}
          required
          autoFocus
          error={errors.comment?.message}
          {...register('comment')}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" isLoading={isSubmitting}>
            Reject report
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CommentDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<boolean>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { comment: '' },
  });

  function close() {
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="Add a comment">
      <form
        onSubmit={handleSubmit(async (values) => {
          const ok = await onSubmit(values.comment);
          if (ok) reset();
        })}
        noValidate
        className="space-y-4"
      >
        <Textarea
          label="Comment"
          rows={4}
          required
          autoFocus
          error={errors.comment?.message}
          {...register('comment')}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Add comment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
