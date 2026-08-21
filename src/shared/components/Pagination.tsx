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
        Showing <span className="font-medium">{first}</span>–
        <span className="font-medium">{last}</span> of <span className="font-medium">{count}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isFetching}
        >
          Previous
        </Button>
        <span className="text-sm text-slate-600">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isFetching}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
