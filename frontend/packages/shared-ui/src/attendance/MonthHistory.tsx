import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Panel } from '../components/AppShell';
import { Button } from '../components/Button';
import { errorMessages, Skeleton, SkeletonScreen, StateMessage } from '../components/Feedback';
import { Stepper } from '../components/Navigation';
import { AttendanceStatusBadge, statusLabel } from '../components/StatusBadge';
import { cn } from '../lib/cn';
import {
  addDays,
  addMonths,
  formatDuration,
  formatLongDate,
  formatMonth,
  formatTime,
  minutesBetween,
  monthRange,
  todayInJakarta,
} from '../lib/format';
import { describeLocation } from '../lib/location';
import { gsap, useGSAP } from '../lib/motion';
import type { Attendance, AttendanceHistory } from '../lib/types';
import { AttendanceDetailDialog } from './AttendanceDetail';

interface MonthHistoryProps {
  /** Distinguishes whose history this is in the query cache, e.g. ['me'] or ['employee', 7]. */
  scope: (string | number)[];
  fetchMonth: (range: { from: string; to: string }) => Promise<AttendanceHistory>;
  employeeName: string;
  /** Months before this date (the join date) can't have records, so "previous" stops there. */
  earliestDate?: string;
}

type DayKind = 'record' | 'absent' | 'weekend' | 'today' | 'idle';

interface CalendarDay {
  date: string;
  day: number;
  kind: DayKind;
  record: Attendance | null;
}

// A month never has more than 31 records, so one page always holds it.
export const MONTH_PAGE_SIZE = 31;

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const isWeekend = (date: string) => weekdayOf(date) === 0 || weekdayOf(date) === 6;

/**
 * Mon to Fri are working days, the same rule as the late flag and "Belum absen".
 * A past working day without a record counts as absent.
 */
function buildMonth(month: string, records: Attendance[], today: string, earliest?: string) {
  const byDate = new Map(records.map((record) => [record.attendanceDate, record]));
  const { from, to } = monthRange(month);
  const days: CalendarDay[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const record = byDate.get(date) ?? null;
    const beforeJoin = earliest !== undefined && date < earliest;
    const kind: DayKind = record
      ? 'record'
      : date === today
        ? 'today'
        : isWeekend(date)
          ? 'weekend'
          : date < today && !beforeJoin
            ? 'absent'
            : 'idle';
    days.push({ date, day: Number(date.slice(8)), kind, record });
  }
  // Monday-first grid: Sunday (0) sits in the last column.
  const leading = (weekdayOf(from) + 6) % 7;
  return { days, leading };
}

const CELL_TONES: Record<string, string> = {
  ON_TIME: 'border-ok/25 bg-ok-tint text-ok',
  LATE: 'border-warn/25 bg-warn-tint text-warn',
  OFF_DAY: 'border-line bg-paper text-ink-soft',
  absent: 'border-dashed border-brand/60 bg-paper text-brand',
  weekend: 'border-transparent bg-surface text-ink-soft/70',
  today: 'border-ink bg-paper text-ink',
  idle: 'border-transparent bg-transparent text-ink-soft/60',
};

function cellLabel(day: CalendarDay, today: string): string {
  const date = formatLongDate(day.date);
  if (day.record) {
    const { checkInAt, checkOutAt, status } = day.record;
    const out = checkOutAt
      ? formatTime(checkOutAt)
      : day.date < today
        ? 'tidak check-out'
        : 'belum check-out';
    return `${date}, ${statusLabel(status)}, ${formatTime(checkInAt)} sampai ${out}`;
  }
  return `${date}, tidak hadir`;
}

function DayCell({
  day,
  today,
  selected,
  onSelect,
}: {
  day: CalendarDay;
  today: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { record } = day;
  const tone = CELL_TONES[record ? record.status : day.kind];
  const missedCheckOut = record && !record.checkOutAt && day.date < today;
  const content = (
    <>
      <span
        className={cn(
          'grid size-6 place-items-center rounded-full text-[13px] font-semibold',
          day.date === today && 'bg-ink text-white',
        )}
      >
        {day.day}
      </span>
      {/* Phones show the colour alone; the panel below the calendar carries the times. */}
      <span className="hidden w-full text-xs leading-tight font-semibold sm:block">
        {record ? (
          <>
            {formatTime(record.checkInAt)}
            {record.checkOutAt && `–${formatTime(record.checkOutAt)}`}
            {missedCheckOut && (
              <span className="block truncate text-[11px] font-normal">tanpa check-out</span>
            )}
          </>
        ) : day.kind === 'absent' ? (
          'Tidak hadir'
        ) : day.kind === 'today' ? (
          <span className="font-normal text-ink-soft">Hari ini</span>
        ) : null}
      </span>
    </>
  );
  const classes = cn(
    'flex min-h-12 flex-col items-start justify-between gap-1 rounded-lg border p-1 text-left sm:min-h-[4.5rem] sm:p-1.5',
    tone,
  );

  if (!record && day.kind !== 'absent') {
    return (
      <div data-cell className={classes}>
        {content}
      </div>
    );
  }
  return (
    <button
      data-cell
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={cellLabel(day, today)}
      className={cn(
        classes,
        'transition-transform duration-200 ease-out-soft hover:-translate-y-0.5 active:translate-y-0',
        selected && 'ring-2 ring-brand ring-offset-2 ring-offset-paper',
      )}
    >
      {content}
    </button>
  );
}

function DayPanel({
  day,
  today,
  onOpen,
}: {
  day: CalendarDay;
  today: string;
  onOpen: (record: Attendance) => void;
}) {
  const { record } = day;
  if (!record) {
    return (
      <div className="px-4 py-3">
        <p className="font-bold">{formatLongDate(day.date)}</p>
        <p className="text-sm text-ink-soft">Hari kerja tanpa check-in.</p>
      </div>
    );
  }
  const note = [record.checkInNote, record.checkOutNote].filter(Boolean).join(' / ');
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-bold">{formatLongDate(day.date)}</span>
          <AttendanceStatusBadge status={record.status} attendance={record} />
        </p>
        <p className="mt-1 text-[15px]">
          {formatTime(record.checkInAt)}
          <span className="text-ink-soft"> sampai </span>
          {record.checkOutAt ? (
            <>
              {formatTime(record.checkOutAt)}
              <span className="text-ink-soft">
                , {formatDuration(minutesBetween(record.checkInAt, record.checkOutAt))}
              </span>
            </>
          ) : day.date < today ? (
            <span className="font-semibold text-warn">tidak check-out</span>
          ) : (
            <>
              <span aria-hidden="true">-</span>
              <span className="sr-only">belum check-out</span>
            </>
          )}
        </p>
        <p className="truncate text-sm text-ink-soft">
          {describeLocation(record.checkInLocation, record.checkInPlace)}
          {note && `, catatan: ${note}`}
        </p>
      </div>
      <Button icon="camera" onClick={() => onOpen(record)}>
        Lihat foto dan lokasi
      </Button>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <SkeletonScreen label="Memuat riwayat absensi">
      <div className="grid grid-cols-7 gap-1 p-2 sm:gap-1.5 sm:p-3">
        {Array.from({ length: 35 }, (_, index) => (
          <Skeleton key={index} className="min-h-12 rounded-lg sm:min-h-[4.5rem]" />
        ))}
      </div>
    </SkeletonScreen>
  );
}

function Legend() {
  const items = [
    ['Tepat waktu', 'border-ok/25 bg-ok-tint'],
    ['Terlambat', 'border-warn/25 bg-warn-tint'],
    ['Tidak hadir', 'border-dashed border-brand/60 bg-paper'],
    ['Akhir pekan', 'border-line bg-surface'],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-[13px] text-ink-soft">
      {items.map(([label, swatch]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn('size-3 rounded-[3px] border', swatch)} />
          {label}
        </span>
      ))}
      <span>Libur nasional belum diperhitungkan.</span>
    </div>
  );
}

export function MonthHistory({ scope, fetchMonth, employeeName, earliestDate }: MonthHistoryProps) {
  const today = todayInJakarta();
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [picked, setPicked] = useState<string | null>(null);
  const [opened, setOpened] = useState<Attendance | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const { data, error, isPending, refetch, isFetching } = useQuery({
    queryKey: ['attendance-history', ...scope, month],
    queryFn: () => fetchMonth(monthRange(month)),
  });

  const records = useMemo(() => data?.data ?? [], [data]);
  const { days, leading } = useMemo(
    () => buildMonth(month, records, today, earliestDate),
    [month, records, today, earliestDate],
  );

  const lateCount = records.filter((record) => record.status === 'LATE').length;
  const absentCount = days.filter((day) => day.kind === 'absent').length;
  // Today's record is still open, not missed, so it doesn't count yet.
  const missedCount = records.filter(
    (record) => !record.checkOutAt && record.attendanceDate < today,
  ).length;

  // Defaults to the latest record, so the panel is never empty on arrival.
  const selectable = days.filter((day) => day.record || day.kind === 'absent');
  const selected =
    selectable.find((day) => day.date === picked) ??
    [...selectable].reverse().find((day) => day.record) ??
    selectable[selectable.length - 1] ??
    null;

  const changeMonth = (delta: number) => {
    setPicked(null);
    setMonth(addMonths(month, delta));
  };

  // Each newly shown month fills in from the first day; keyed on the month, not on refetches.
  useGSAP(
    () => {
      if (!data) return;
      gsap.fromTo(
        '[data-cell]',
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.35, stagger: { amount: 0.3 }, ease: 'power2.out' },
      );
    },
    { scope: gridRef, dependencies: [month, data === undefined] },
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Stepper
          label={formatMonth(month)}
          previousLabel="Bulan sebelumnya"
          nextLabel="Bulan berikutnya"
          onPrevious={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
          nextDisabled={month >= currentMonth}
        />
        {data && (records.length > 0 || absentCount > 0) && (
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">{records.length} hari hadir</span>
            {lateCount > 0 && `, ${lateCount} terlambat`}
            {absentCount > 0 && (
              <span className="font-semibold text-brand">, {absentCount} tidak hadir</span>
            )}
            {missedCount > 0 && `, ${missedCount} tanpa check-out`}
          </p>
        )}
      </div>

      <Panel className="overflow-hidden">
        {isPending ? (
          <CalendarSkeleton />
        ) : error ? (
          <StateMessage
            title="Riwayat absensi gagal dimuat"
            action={
              <Button icon="refresh" loading={isFetching} onClick={() => void refetch()}>
                Coba lagi
              </Button>
            }
          >
            {errorMessages(error)[0]}
          </StateMessage>
        ) : (
          <>
            <div ref={gridRef} className="p-2 sm:p-3">
              <div
                aria-hidden="true"
                className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-soft sm:gap-1.5"
              >
                {WEEKDAYS.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {Array.from({ length: leading }, (_, index) => (
                  <span key={`blank-${index}`} aria-hidden="true" />
                ))}
                {days.map((day) => (
                  <DayCell
                    key={day.date}
                    day={day}
                    today={today}
                    selected={selected?.date === day.date}
                    onSelect={() => setPicked(day.date)}
                  />
                ))}
              </div>
            </div>

            <div aria-live="polite" className="border-t border-line bg-surface/60">
              {selected ? (
                <DayPanel day={selected} today={today} onOpen={setOpened} />
              ) : (
                <p className="px-4 py-3 text-sm text-ink-soft">
                  {earliestDate && monthRange(month).to < earliestDate
                    ? 'Bulan ini sebelum tanggal bergabung.'
                    : month === currentMonth
                      ? 'Absensi bulan ini akan muncul di sini setelah check-in pertama.'
                      : 'Tidak ada check-in yang tercatat pada bulan ini.'}
                </p>
              )}
            </div>
            <Legend />
          </>
        )}
      </Panel>

      <AttendanceDetailDialog
        attendance={opened}
        employeeName={employeeName}
        onClose={() => setOpened(null)}
      />
    </>
  );
}
