import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  addDays,
  api,
  type AttendanceHistory,
  cn,
  formatTime,
  gsap,
  MOTION,
  mondayOf,
  Skeleton,
  useGSAP,
} from '@dexa/shared-ui';

const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** Monday to Friday of this week: when each check-in happened, and whether it was late. */
export function WeekStrip({ today }: { today: string }) {
  const monday = mondayOf(today);
  const days = Array.from({ length: 5 }, (_, index) => addDays(monday, index));
  const ref = useRef<HTMLOListElement>(null);

  // Shares the history cache key, so a check-in refreshes this strip too.
  const { data, isPending, isError } = useQuery({
    queryKey: ['attendance-history', 'me', 'week', monday],
    queryFn: () =>
      api.get<AttendanceHistory>('/attendance/me', { from: monday, to: days[4], limit: 7 }),
  });

  useGSAP(
    () => {
      if (!data) return;
      gsap.fromTo(
        '[data-day]',
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: MOTION.enter, stagger: MOTION.stagger, ease: MOTION.ease },
      );
    },
    { scope: ref, dependencies: [Boolean(data)] },
  );

  // The strip is a glance, not a record; if it fails, the Riwayat page has the full story.
  if (isError) return null;

  const byDate = new Map(data?.data.map((record) => [record.attendanceDate, record]));

  const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
  const range = `Jam check-in Anda dari Senin, ${dayMonth.format(asDate(monday))} sampai Jumat, ${dayMonth.format(asDate(days[4]))}.`;

  return (
    <section
      aria-labelledby="week-title"
      className="rounded-2xl border border-line bg-paper px-5 pt-4 pb-5"
    >
      <h2 id="week-title" className="font-bold">
        Kehadiran minggu ini
      </h2>
      <p className="mb-3 text-sm text-ink-soft">{range}</p>
      {isPending ? (
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {days.map((day) => (
            <Skeleton key={day} className="h-[84px] rounded-lg" />
          ))}
        </div>
      ) : (
        <ol ref={ref} className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {days.map((day) => {
            const record = byDate.get(day);
            const future = day > today;
            const isToday = day === today;
            const date = new Date(`${day}T00:00:00Z`);
            const late = record?.status === 'LATE';
            const state = record
              ? late
                ? 'Terlambat'
                : 'Tepat waktu'
              : future
                ? ''
                : isToday
                  ? 'Belum check-in'
                  : 'Tidak hadir';
            return (
              <li
                key={day}
                data-day
                aria-current={isToday ? 'date' : undefined}
                className={cn(
                  'relative flex min-h-[84px] flex-col items-center overflow-hidden rounded-lg border px-0.5 pt-1.5 pb-2.5 text-center sm:px-1',
                  isToday
                    ? 'border-2 border-brand bg-paper'
                    : future
                      ? 'border-dashed border-line-strong'
                      : 'border-line bg-surface',
                )}
              >
                <span className="text-xs font-semibold text-ink-soft">
                  {weekday.format(date)} {date.getUTCDate()}
                </span>
                <span className={cn('mt-0.5 font-extrabold', !record && 'text-ink-soft')}>
                  {record ? formatTime(record.checkInAt) : ''}
                  <span className="sr-only">{record ? '' : state || 'belum tiba'}</span>
                </span>
                {state && (
                  <span
                    aria-hidden={!record}
                    className={cn(
                      'mt-auto text-[10px] leading-tight font-semibold sm:text-[11px]',
                      record ? (late ? 'text-warn' : 'text-ok') : 'text-ink-soft',
                    )}
                  >
                    {state}
                  </span>
                )}
                {record && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-0 bottom-0 h-1',
                      late ? 'bg-warn-mark' : 'bg-ok-mark',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
