import { IconButton } from './Button';

/** "11-20 dari 47" with previous and next. Hidden when everything fits on one page. */
export function Pagination({
  page,
  limit,
  total,
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <nav aria-label="Halaman" className="flex items-center justify-between gap-3 px-1 pt-2">
      <p className="text-sm text-ink-soft tabular-nums">
        {first}-{last} dari {total}
      </p>
      <div className="flex items-center gap-1">
        <IconButton
          icon="chevronLeft"
          label="Halaman sebelumnya"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        <span className="px-1 text-sm tabular-nums">
          {page} / {totalPages}
        </span>
        <IconButton
          icon="chevronRight"
          label="Halaman berikutnya"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </nav>
  );
}

/** Previous / label / next, for stepping through days or months. */
export function Stepper({
  label,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  nextDisabled = false,
}: {
  label: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <IconButton icon="chevronLeft" label={previousLabel} onClick={onPrevious} />
      <p aria-live="polite" className="min-w-36 text-center font-semibold">
        {label}
      </p>
      <IconButton icon="chevronRight" label={nextLabel} onClick={onNext} disabled={nextDisabled} />
    </div>
  );
}
