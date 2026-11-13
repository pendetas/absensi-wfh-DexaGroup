import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  addDays,
  api,
  type AttendanceHistory,
  cn,
  formatDuration,
  formatDurationShort,
  formatTime,
  gsap,
  MOTION,
  mondayOf,
  Skeleton,
  useGSAP,
} from '@dexa/shared-ui';
import { type DayHours, dayHours } from '../lib/work-hours';

const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

/** Bars are drawn against 125% of the target, so a full day reaches the dashed line. */
const SCALE = 1.25;
const CHART_HEIGHT = 132;

function stateLine(day: DayHours, target: number): { text: string; tone: string } {
  switch (day.state) {
    case 'done':
      return day.minutes! >= target
        ? { text: 'Tercapai', tone: 'text-ok' }
        : { text: `Kurang ${formatDurationShort(target - day.minutes!)}`, tone: 'text-warn' };
    case 'running':
      return { text: 'Berjalan', tone: 'text-brand' };
    case 'missed-checkout':
      return { text: 'Tanpa check-out', tone: 'text-warn' };
    case 'absent':
      return { text: 'Tidak hadir', tone: 'text-ink-soft' };
    case 'not-yet':
      return { text: 'Belum check-in', tone: 'text-ink-soft' };
    case 'future':
      return { text: '', tone: '' };
  }
}

/** The week's total is measured against five times the daily target. */
export function WeekHours({
  today,
  now,
  dailyWorkMinutes,
}: {
  today: string;
  now: Date;
  dailyWorkMinutes: number;
}) {
  const monday = mondayOf(today);
  const days = Array.from({ length: 5 }, (_, index) => addDays(monday, index));
  const chartRef = useRef<HTMLDivElement>(null);

  // Shares the history cache key, so a check-in or check-out refreshes this too.
  const { data, isPending, isError } = useQuery({
    queryKey: ['attendance-history', 'me', 'week', monday],
    queryFn: () =>
      api.get<AttendanceHistory>('/attendance/me', { from: monday, to: days[4], limit: 7 }),
  });

  useGSAP(
    () => {
      if (!data) return;
      gsap.fromTo(
        '[data-bar]',
        { scaleY: 0 },
        { scaleY: 1, duration: 0.7, stagger: MOTION.stagger, ease: 'power3.out' },
      );
      gsap.fromTo(
        '[data-total-bar]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.9, delay: 0.2, ease: 'power3.out' },
      );
    },
    { scope: chartRef, dependencies: [Boolean(data)] },
  );

  // Only a summary: on failure, the Riwayat page still has the full record.
  if (isError) return null;

  const byDate = new Map(data?.data.map((record) => [record.attendanceDate, record]));
  const week = days.map((day) => dayHours(day, today, byDate.get(day) ?? null, now));
  const total = week.reduce((sum, day) => sum + (day.minutes ?? 0), 0);
  const weekTarget = dailyWorkMinutes * days.length;
  const max = dailyWorkMinutes * SCALE;
  const targetFromBottom = (dailyWorkMinutes / max) * CHART_HEIGHT;
  const missed = week.filter((day) => day.state === 'missed-checkout').length;

  return (
    <section
      aria-labelledby="week-title"
      className="rounded-2xl border border-line bg-paper px-5 pt-4 pb-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="week-title" className="font-bold">
          Jam kerja minggu ini
        </h2>
        <p className="text-sm text-ink-soft">
          Senin, {dayMonth.format(asDate(monday))} sampai Jumat, {dayMonth.format(asDate(days[4]))}
        </p>
      </div>

      {isPending ? (
        <div aria-hidden="true">
          <Skeleton className="mt-3 h-8 w-44" />
          <Skeleton className="mt-2 h-2 w-full rounded-full" />
          <div className="mt-6 grid grid-cols-5 items-end gap-2" style={{ height: CHART_HEIGHT }}>
            {['h-1/2', 'h-3/4', 'h-2/3', 'h-1/3', 'h-1/4'].map((height) => (
              <Skeleton key={height} className={cn('rounded-t-lg', height)} />
            ))}
          </div>
          <Skeleton className="mt-3 h-10 w-full" />
        </div>
      ) : (
        <div ref={chartRef}>
          <p className="mt-3">
            <span className="text-3xl font-extrabold">{formatDuration(total)}</span>
            <span className="text-ink-soft"> dari {formatDuration(weekTarget)}</span>
          </p>
          <div
            role="progressbar"
            aria-label="Jam kerja minggu ini dibanding target"
            aria-valuemin={0}
            aria-valuemax={weekTarget}
            aria-valuenow={Math.min(total, weekTarget)}
            aria-valuetext={`${formatDuration(total)} dari ${formatDuration(weekTarget)}`}
            className="mt-2 h-2 overflow-hidden rounded-full bg-line"
          >
            <div
              data-total-bar
              className="h-full origin-left rounded-full bg-brand"
              style={{ width: `${Math.min(100, (total / weekTarget) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            Target {formatDuration(dailyWorkMinutes)} per hari, dihitung dari check-in sampai
            check-out.
            {missed > 0 && ` ${missed} hari tanpa check-out tidak ikut terhitung.`}
          </p>

          {/* The dashed line marks the daily target. */}
          <div className="relative mt-6" aria-hidden="true">
            <div
              className="absolute inset-x-0 z-10 border-t-2 border-dashed border-brand"
              style={{ bottom: targetFromBottom }}
            >
              <span className="absolute -top-5 right-0 rounded-sm bg-paper px-1 text-[11px] font-bold text-brand">
                Target {formatDurationShort(dailyWorkMinutes)}
              </span>
            </div>
            <div className="grid grid-cols-5 items-end gap-2" style={{ height: CHART_HEIGHT }}>
              {week.map((day) => {
                const height =
                  day.minutes === null
                    ? 0
                    : Math.max(6, (Math.min(day.minutes, max) / max) * CHART_HEIGHT);
                const reached = day.minutes !== null && day.minutes >= dailyWorkMinutes;
                return (
                  <div key={day.date} className="flex h-full flex-col justify-end">
                    {day.state === 'missed-checkout' || day.state === 'absent' ? (
                      <div className="h-1.5 rounded-full border border-dashed border-line-strong" />
                    ) : day.state === 'future' || day.state === 'not-yet' ? (
                      <div
                        className={cn(
                          'h-1.5 rounded-full',
                          day.state === 'not-yet' ? 'bg-brand/40' : 'bg-line',
                        )}
                      />
                    ) : (
                      <div
                        data-bar
                        className={cn(
                          'origin-bottom rounded-t-lg',
                          day.state === 'running'
                            ? 'bg-[repeating-linear-gradient(135deg,var(--color-brand)_0_6px,rgb(165_40_35/0.75)_6px_12px)]'
                            : reached
                              ? 'bg-ok-mark'
                              : 'bg-warn-mark',
                        )}
                        style={{ height }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <ol className="mt-2 grid grid-cols-5 gap-2 border-t border-line pt-2 text-center">
            {week.map((day) => {
              const { text, tone } = stateLine(day, dailyWorkMinutes);
              const isToday = day.date === today;
              return (
                <li key={day.date} aria-current={isToday ? 'date' : undefined}>
                  <span
                    className={cn(
                      'block text-xs font-semibold',
                      isToday ? 'text-brand' : 'text-ink-soft',
                    )}
                  >
                    {weekday.format(asDate(day.date))} {asDate(day.date).getUTCDate()}
                  </span>
                  <span className="block text-sm font-extrabold sm:text-[15px]">
                    {day.minutes !== null ? formatDurationShort(day.minutes) : ' '}
                  </span>
                  {text && (
                    <span
                      className={cn(
                        'block text-[10px] leading-tight font-semibold sm:text-[11px]',
                        tone,
                      )}
                    >
                      {text}
                    </span>
                  )}
                  {day.attendance && (
                    <span className="block text-[10px] text-ink-soft sm:text-[11px]">
                      Masuk {formatTime(day.attendance.checkInAt)}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
