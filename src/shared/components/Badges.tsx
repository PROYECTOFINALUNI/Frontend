import type { ApprovalStepStatus, ExpenseStatus } from '@/shared/types/domain';
import type { WarningSeverity } from '@/shared/money/money';
import { cn } from '@/shared/utils/cn';

/** Los indicadores combinan color, texto e iconos para que el estado no dependa únicamente del color.
 */
const STATUS_STYLES: Record<ExpenseStatus, { className: string; glyph: string; label: string }> = {
  DRAFT: { className: 'bg-slate-100 text-slate-700 ring-slate-300', glyph: '○', label: 'Borrador' },
  SUBMITTED: { className: 'bg-sky-100 text-sky-800 ring-sky-300', glyph: '◐', label: 'Enviado' },
  APPROVED: {
    className: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
    glyph: '✓',
    label: 'Aprobado',
  },
  REJECTED: { className: 'bg-red-100 text-red-800 ring-red-300', glyph: '✕', label: 'Rechazado' },
  PAID: {
    className: 'bg-violet-100 text-violet-800 ring-violet-300',
    glyph: '€',
    label: 'Pagado',
  },
};

export function StatusBadge({ status, className }: { status: ExpenseStatus; className?: string }) {
  const style = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        style.className,
        className
      )}
    >
      <span aria-hidden="true">{style.glyph}</span>
      {style.label}
    </span>
  );
}

const SEVERITY_STYLES: Record<
  WarningSeverity,
  { className: string; glyph: string; label: string }
> = {
  INFO: { className: 'bg-sky-100 text-sky-800 ring-sky-300', glyph: 'i', label: 'Info' },
  WARNING: {
    className: 'bg-amber-100 text-amber-900 ring-amber-300',
    glyph: '!',
    label: 'Aviso',
  },
  BLOCKING: { className: 'bg-red-100 text-red-800 ring-red-300', glyph: '⛔', label: 'Bloqueado' },
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: WarningSeverity;
  className?: string;
}) {
  const style = SEVERITY_STYLES[severity];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        style.className,
        className
      )}
    >
      <span aria-hidden="true">{style.glyph}</span>
      {style.label}
    </span>
  );
}

const STEP_STYLES: Record<ApprovalStepStatus, { className: string; glyph: string; label: string }> =
  {
    PENDING: {
      className: 'bg-amber-100 text-amber-900 ring-amber-300',
      glyph: '⋯',
      label: 'Pendiente',
    },
    APPROVED: {
      className: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
      glyph: '✓',
      label: 'Aprobado',
    },
    REJECTED: { className: 'bg-red-100 text-red-800 ring-red-300', glyph: '✕', label: 'Rechazado' },
    SKIPPED: {
      className: 'bg-slate-100 text-slate-600 ring-slate-300',
      glyph: '–',
      label: 'Omitido',
    },
  };

export function StepStatusBadge({ status }: { status: ApprovalStepStatus }) {
  const style = STEP_STYLES[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        style.className
      )}
    >
      <span aria-hidden="true">{style.glyph}</span>
      {style.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-300 ring-inset">
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}
