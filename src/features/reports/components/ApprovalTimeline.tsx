import type { ApprovalEvent, ApprovalAction } from '@/shared/types/domain';
import { EmptyState } from '@/shared/components/States';
import { formatDateTime, relativeTime } from '@/shared/utils/dates';
import { cn } from '@/shared/utils/cn';

const ACTION_LABELS: Record<ApprovalAction, string> = {
  SUBMITTED: 'envió el informe',
  APPROVED: 'aprobó el informe',
  AUTO_APPROVED: 'envió un informe que fue aprobado automáticamente',
  REJECTED: 'rechazó el informe',
  DELEGATED: 'reasignó la aprobación',
  COMMENTED: 'añadió un comentario',
  RETURNED_TO_DRAFT: 'devolvió el informe a borrador',
  PAID: 'marcó el informe como pagado',
};

const ACTION_MARKERS: Record<ApprovalAction, { glyph: string; className: string }> = {
  SUBMITTED: { glyph: '↑', className: 'bg-sky-100 text-sky-800 ring-sky-300' },
  APPROVED: { glyph: '✓', className: 'bg-emerald-100 text-emerald-800 ring-emerald-300' },
  AUTO_APPROVED: { glyph: '⚡', className: 'bg-emerald-100 text-emerald-800 ring-emerald-300' },
  REJECTED: { glyph: '✕', className: 'bg-red-100 text-red-800 ring-red-300' },
  DELEGATED: { glyph: '→', className: 'bg-indigo-100 text-indigo-800 ring-indigo-300' },
  COMMENTED: { glyph: '💬', className: 'bg-slate-100 text-slate-700 ring-slate-300' },
  RETURNED_TO_DRAFT: { glyph: '↩', className: 'bg-amber-100 text-amber-900 ring-amber-300' },
  PAID: { glyph: '€', className: 'bg-violet-100 text-violet-800 ring-violet-300' },
};


export function ApprovalTimeline({ events }: { events: ApprovalEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Submitting the report will record the first audit event."
      />
    );
  }

  return (
    <ol className="space-y-4 px-4 py-4">
      {events.map((event, index) => {
        const marker = ACTION_MARKERS[event.action];
        const isLast = index === events.length - 1;

        return (
          <li key={event.id} className="relative flex gap-3">
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute top-8 left-[0.9375rem] h-full w-px bg-slate-200"
              />
            )}

            <span
              aria-hidden="true"
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset',
                marker.className
              )}
            >
              {marker.glyph}
            </span>

            <div className="min-w-0 flex-1 pb-1">
              <p className="text-sm text-slate-900">
                <span className="font-medium">{event.actor.fullName}</span>{' '}
                {ACTION_LABELS[event.action]}
              </p>
              <p className="text-xs text-slate-500">
                <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
                <span className="mx-1" aria-hidden="true">
                  ·
                </span>
                {relativeTime(event.createdAt)}
              </p>
              {event.comment && (
                <blockquote className="mt-1.5 rounded-md bg-slate-50 px-3 py-2 text-sm whitespace-pre-wrap text-slate-700 ring-1 ring-slate-200 ring-inset">
                  {event.comment}
                </blockquote>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
