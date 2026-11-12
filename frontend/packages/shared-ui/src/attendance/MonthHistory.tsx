import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Panel } from '../components/AppShell';
import { Button } from '../components/Button';
import { errorMessages, Skeleton, SkeletonScreen, StateMessage } from '../components/Feedback';
import { Stepper } from '../components/Navigation';
import { AttendanceStatusBadge } from '../components/StatusBadge';
import {
  addMonths,
  formatDay,
  formatDuration,
  formatMonth,
  formatTime,
  minutesBetween,
  monthRange,
  todayInJakarta,
} from '../lib/format';
import { gsap, MOTION, useGSAP } from '../lib/motion';
import type { Attendance, AttendanceHistory } from '../lib/types';
import { AttendanceDetailDialog } from './AttendanceDetail';
import { DayTrack } from './DayTrack';

interface MonthHistoryProps {
  /** Distinguishes whose history this is in the query cache, e.g. ['me'] or ['employee', 7]. */
  scope: (string | number)[];
  fetchMonth: (range: { from: string; to: string }) => Promise<AttendanceHistory>;
  employeeName: string;
  /** Months before this date (the join date) can't have records, so "previous" stops there. */
  earliestDate?: string;
}

const ROW_GRID = 'grid-cols-[1fr_auto] sm:grid-cols-[7.5rem_9.5rem_minmax(0,1fr)_5.5rem_auto]';

function DayRow({ attendance, onOpen }: { attendance: Attendance; onOpen: () => void }) {
  const today = todayInJakarta();
  const missedCheckOut = !attendance.checkOutAt && attendance.attendanceDate < today;
  return (
    <li data-row className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={onOpen}
        className={`group grid w-full ${ROW_GRID} items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors duration-200 hover:bg-brand-wash active:bg-brand-tint`}
      >
        <span className="font-semibold">
          <span className="bg-[linear-gradient(var(--color-brand),var(--color-brand))] bg-[length:0_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 ease-out-soft group-hover:bg-[length:100%_2px]">
            {formatDay(attendance.attendanceDate)}
          </span>
        </span>
        <span className="justify-self-end sm:order-last">
          <AttendanceStatusBadge status={attendance.status} attendance={attendance} />
        </span>
        <span className="text-sm sm:text-[15px]">
          {formatTime(attendance.checkInAt)}
          <span className="text-ink-soft"> sampai </span>
          {attendance.checkOutAt ? (
            formatTime(attendance.checkOutAt)
          ) : (
            <span className={missedCheckOut ? 'font-semibold text-warn' : 'text-ink-soft'}>
              {missedCheckOut ? 'tidak check-out' : 'belum'}
            </span>
          )}
        </span>
        <DayTrack
          attendance={attendance}
          workStartTime={attendance.workStartTime}
          isToday={attendance.attendanceDate === today}
          className="col-span-2 sm:col-span-1"
        />
        <span className="hidden text-sm text-ink-soft sm:block">
          {attendance.checkOutAt
            ? formatDuration(minutesBetween(attendance.checkInAt, attendance.checkOutAt))
            : ''}
        </span>
      </button>
    </li>
  );
}

function HistorySkeleton() {
  return (
    <SkeletonScreen label="Memuat riwayat absensi">
      {[0, 1, 2, 3, 4].map((row) => (
        <div
          key={row}
          className={`grid ${ROW_GRID} items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 last:border-b-0`}
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-24 justify-self-end rounded sm:order-last" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="col-span-2 h-2.5 rounded-full sm:col-span-1" />
          <Skeleton className="hidden h-4 w-16 sm:block" />
        </div>
      ))}
    </SkeletonScreen>
  );
}

/** One month of attendance with a stepper; a row opens that day's photos. */
export function MonthHistory({ scope, fetchMonth, employeeName, earliestDate }: MonthHistoryProps) {
  const currentMonth = todayInJakarta().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [selected, setSelected] = useState<Attendance | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { data, error, isPending, refetch, isFetching } = useQuery({
    queryKey: ['attendance-history', ...scope, month],
    queryFn: () => fetchMonth(monthRange(month)),
  });

  // Each newly shown month enters row by row, and its time bars draw from check-in onward.
  useGSAP(
    () => {
      if (!data?.data.length) return;
      gsap.fromTo(
        '[data-row]',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: MOTION.enter, stagger: MOTION.stagger, ease: MOTION.ease },
      );
      gsap.fromTo(
        '[data-track-bar]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.6, stagger: MOTION.stagger, delay: 0.1, ease: 'power2.out' },
      );
    },
    // Keyed on the records shown, so a background refetch doesn't replay the entrance.
    { scope: listRef, dependencies: [data?.data.map((record) => record.id).join()] },
  );

  const records = data?.data ?? [];
  const lateCount = records.filter((record) => record.status === 'LATE').length;
  // Today's record is still open, not missed, so it doesn't count yet.
  const today = todayInJakarta();
  const missedCount = records.filter(
    (record) => !record.checkOutAt && record.attendanceDate < today,
  ).length;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Stepper
          label={formatMonth(month)}
          previousLabel="Bulan sebelumnya"
          nextLabel="Bulan berikutnya"
          onPrevious={() => setMonth(addMonths(month, -1))}
          onNext={() => setMonth(addMonths(month, 1))}
          nextDisabled={month >= currentMonth}
        />
        {data && records.length > 0 && (
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">{records.length} hari hadir</span>
            {lateCount > 0 && `, ${lateCount} terlambat`}
            {missedCount > 0 && `, ${missedCount} tanpa check-out`}
          </p>
        )}
      </div>

      <Panel className="overflow-hidden">
        {isPending ? (
          <HistorySkeleton />
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
        ) : records.length === 0 ? (
          <StateMessage title={`Tidak ada absensi di ${formatMonth(month)}`}>
            {earliestDate && monthRange(month).to < earliestDate
              ? 'Bulan ini sebelum tanggal bergabung.'
              : month === currentMonth
                ? 'Absensi bulan ini akan muncul di sini setelah check-in pertama.'
                : 'Tidak ada check-in yang tercatat pada bulan ini.'}
          </StateMessage>
        ) : (
          <>
            <div
              aria-hidden="true"
              className={`hidden ${ROW_GRID} gap-x-4 border-b border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-soft sm:grid`}
            >
              <span>Tanggal</span>
              <span>Jam</span>
              <span>07.00 sampai 19.00</span>
              <span>Durasi</span>
              <span>Status</span>
            </div>
            <ul ref={listRef}>
              {records.map((record) => (
                <DayRow key={record.id} attendance={record} onOpen={() => setSelected(record)} />
              ))}
            </ul>
          </>
        )}
      </Panel>

      <AttendanceDetailDialog
        attendance={selected}
        employeeName={employeeName}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
