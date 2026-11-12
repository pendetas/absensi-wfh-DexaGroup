import { cn } from '../lib/cn';
import { minutesOfDayInJakarta } from '../lib/format';
import type { Attendance } from '../lib/types';

const FROM = 7 * 60;
const SPAN = 12 * 60;
const pct = (minutes: number) => Math.min(100, Math.max(0, ((minutes - FROM) / SPAN) * 100));

/**
 * One day from 07.00 to 19.00 on a thin line: the dashed work start line, and a bar from
 * check-in to check-out. An open record fades out at "now" (today) or after an hour (a missed
 * check-out), so it never claims an end time that wasn't recorded.
 */
export function DayTrack({
  attendance,
  workStartTime,
  isToday,
  className,
}: {
  attendance: Attendance | null;
  /** HH:mm; omitted on a non-working day. */
  workStartTime?: string | null;
  isToday: boolean;
  className?: string;
}) {
  const start = workStartTime
    ? Number(workStartTime.slice(0, 2)) * 60 + Number(workStartTime.slice(3, 5))
    : null;
  const checkIn = attendance ? minutesOfDayInJakarta(attendance.checkInAt) : null;
  const end = attendance?.checkOutAt
    ? minutesOfDayInJakarta(attendance.checkOutAt)
    : checkIn !== null
      ? isToday
        ? minutesOfDayInJakarta(new Date())
        : checkIn + 60
      : null;
  const late = attendance?.status === 'LATE';

  return (
    <div aria-hidden="true" className={cn('relative h-5', className)}>
      <div className="absolute inset-x-0 top-[9px] h-0.5 rounded bg-line" />
      {start !== null && (
        <div
          className="absolute top-0.5 bottom-0.5 border-l-2 border-dashed border-brand/60"
          style={{ left: `${pct(start)}%` }}
        />
      )}
      {checkIn !== null && end !== null && (
        <div
          data-track-bar
          className={cn(
            'absolute top-[5px] h-2.5 origin-left rounded-full',
            late ? 'bg-warn' : 'bg-ok',
            !attendance?.checkOutAt &&
              (late
                ? 'bg-[linear-gradient(90deg,var(--color-warn)_65%,rgb(138_83_0/0.12))]'
                : 'bg-[linear-gradient(90deg,var(--color-ok)_65%,rgb(29_107_60/0.12))]'),
          )}
          style={{
            left: `${pct(checkIn)}%`,
            width: `${Math.max(1.5, pct(end) - pct(checkIn))}%`,
          }}
        />
      )}
    </div>
  );
}
