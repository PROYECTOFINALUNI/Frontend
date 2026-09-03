import { Button } from '@/shared/components/Button';

export const DEFAULT_PAGE_SIZE = 25;

export function Pagination({
  page,
  count,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
  isFetching,
}: {
  page: number;
  count: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  if (count === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, count);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3"
    >
      <p className="text-sm text-slate-600" aria-live="polite">
        Mostrando <span className="font-medium">{first}</span>–
        <span className="font-medium">{last}</span> de <span className="font-medium">{count}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isFetching}
          aria-label="Página anterior"
          className="text-[#5b50f6] hover:border-[#d8d4fe] hover:bg-[#f0efff] hover:text-[#4f46e5] disabled:text-[#b6bdc8]"
        >
          <ChevronLeftIcon />
        </Button>

        <span className="text-sm font-medium text-[#6b7280]">
          Página {page} de {totalPages}
        </span>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isFetching}
          aria-label="Página siguiente"
          className="text-[#5b50f6] hover:border-[#d8d4fe] hover:bg-[#f0efff] hover:text-[#4f46e5] disabled:text-[#b6bdc8]"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </nav>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M12.5 15 7.5 10l5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// svg para las flechas < > de los botones de anterior y siguiente
function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="m7.5 5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}