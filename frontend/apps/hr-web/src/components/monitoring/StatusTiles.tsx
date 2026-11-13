import { useRef } from 'react';
import {
  cn,
  type DailyMonitoring,
  type DailyStatus,
  gsap,
  statusLabel,
  useGSAP,
} from '@dexa/shared-ui';

export type StatusFilter = DailyStatus | 'ALL';

export interface FilterOption {
  value: StatusFilter;
  label: string;
  count: number;
  /** Colour of the bar under the tile, matching the dots and badges of that status. */
  mark: string;
}

/** The day's totals double as the status filter, so the counts and the list never disagree. */
export function filterOptions(day: DailyMonitoring): FilterOption[] {
  const { summary } = day;
  const total = summary.onTime + summary.late + summary.offDay + summary.notCheckedIn;
  return [
    { value: 'ALL', label: 'Semua', count: total, mark: 'bg-brand' },
    ...(day.isWorkingDay
      ? [
          {
            value: 'NOT_CHECKED_IN' as const,
            label: statusLabel('NOT_CHECKED_IN'),
            count: summary.notCheckedIn,
            mark: 'bg-ink',
          },
          {
            value: 'LATE' as const,
            label: statusLabel('LATE'),
            count: summary.late,
            mark: 'bg-warn-mark',
          },
          {
            value: 'ON_TIME' as const,
            label: statusLabel('ON_TIME'),
            count: summary.onTime,
            mark: 'bg-ok-mark',
          },
        ]
      : [
          {
            value: 'OFF_DAY' as const,
            label: 'Hadir di hari libur',
            count: summary.offDay,
            mark: 'bg-ok-mark',
          },
        ]),
  ];
}

/** A number that rolls from its previous value to the new one, so a change is noticed. */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  useGSAP(
    () => {
      const counter = { value: shown.current };
      gsap.to(counter, {
        value,
        duration: 0.8,
        ease: 'power2.out',
        onUpdate: () => {
          shown.current = Math.round(counter.value);
          if (ref.current) ref.current.textContent = String(shown.current);
        },
      });
    },
    { dependencies: [value] },
  );
  return <span ref={ref}>{shown.current}</span>;
}

export function StatusTiles({
  options,
  active,
  onChange,
}: {
  options: FilterOption[];
  active: StatusFilter;
  onChange: (status: StatusFilter) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Saring menurut status"
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
    >
      {options.map((option) => {
        const pressed = active === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            aria-label={`${option.label}: ${option.count}`}
            onClick={() => onChange(option.value)}
            className={cn(
              'group relative overflow-hidden rounded-xl border bg-paper px-4 pt-3 pb-3.5 text-left',
              'transition duration-200 ease-out-soft hover:-translate-y-0.5 active:translate-y-0 active:scale-[.99]',
              pressed ? 'border-ink' : 'border-line hover:border-line-strong',
            )}
          >
            <span aria-hidden="true" className="block text-[32px] leading-tight font-extrabold">
              <CountUp value={option.count} />
            </span>
            <span aria-hidden="true" className="text-sm font-semibold text-ink-soft">
              {option.label}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-x-0 bottom-0 h-1 origin-left transition-transform duration-300 ease-out-soft',
                option.mark,
                pressed ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
