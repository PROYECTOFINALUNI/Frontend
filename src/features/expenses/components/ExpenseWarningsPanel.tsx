import { SeverityBadge } from '@/shared/components/Badges';
import type { WarningSeverity } from '@/shared/money/money';
import { cn } from '@/shared/utils/cn';

export type DisplayWarning = {
  severity: WarningSeverity;
  message: string;
  key: string;
};

const SEVERITY_RANK: Record<WarningSeverity, number> = { BLOCKING: 0, WARNING: 1, INFO: 2 };

/** Muestra los avisos en una región ARIA para anunciarlos sin cambiar el foco del usuario */
export function ExpenseWarningsPanel({
  warnings,
  isPreview = false,
  className,
  emptyMessage = 'Sin aviso para este gasto.',
}: {
  warnings: DisplayWarning[];
  isPreview?: boolean;
  className?: string;
  emptyMessage?: string;
}) {
  const sorted = [...warnings].sort(
    (left, right) => SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]
  );

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={cn('space-y-2', className)}>
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((warning) => (
            <li
              key={warning.key}
              className={cn(
                'flex flex-wrap items-start gap-2 rounded-md px-3 py-2 text-sm ring-1 ring-inset',
                warning.severity === 'BLOCKING' && 'bg-red-50 text-red-900 ring-red-200',
                warning.severity === 'WARNING' && 'bg-amber-50 text-amber-900 ring-amber-200',
                warning.severity === 'INFO' && 'bg-sky-50 text-sky-900 ring-sky-200'
              )}
            >
              <SeverityBadge severity={warning.severity} />
              <span className="min-w-0 flex-1">{warning.message}</span>
            </li>
          ))}
        </ul>
      )}

      {isPreview && sorted.length > 0 && (
        <p className="text-xs text-slate-500">
          Solo previsualización. El backend vuelve a evaluar todas las reglas al guardar el gasto y de nuevo al enviar el informe.
        </p>
      )}
    </div>
  );
}
