import { Skeleton } from '@dexa/shared-ui';
import { ROW_GRID } from './MonitoringRow';

/** The tiles, the arrival chart and list rows in their final shape, waiting for numbers. */
export function SummarySkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <div key={tile} className="rounded-xl border border-line bg-paper px-4 pt-3.5 pb-4">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="mt-2 h-3.5 w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-line bg-paper px-5 pt-4 pb-3">
        <Skeleton className="h-4 w-44" />
        <div className="mt-4 flex h-24 items-end gap-3">
          {/* Uneven heights hint at stacked dots without pretending to be data. */}
          {['h-10', 'h-14', 'h-7', 'h-16', 'h-11', 'h-14', 'h-8', 'h-12'].map((height, index) => (
            <Skeleton key={index} className={`w-7 rounded-full ${height}`} />
          ))}
        </div>
        <Skeleton className="mt-2 h-px w-full" />
      </div>
    </>
  );
}

export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className={`grid ${ROW_GRID} items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5 last:border-b-0`}
        >
          <Skeleton className="size-[52px] rounded-lg" />
          <div>
            <Skeleton className="h-4 w-36 max-w-full" />
            <Skeleton className="mt-2 h-3 w-28 max-w-full" />
          </div>
          <Skeleton className="h-6 w-24 justify-self-end rounded md:order-last md:justify-self-start" />
          <Skeleton className="col-span-2 col-start-2 h-2.5 rounded-full md:col-span-1 md:col-start-auto" />
          <div className="col-span-2 col-start-2 md:col-span-1 md:col-start-auto">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1.5 h-3 w-20" />
          </div>
        </div>
      ))}
    </>
  );
}
