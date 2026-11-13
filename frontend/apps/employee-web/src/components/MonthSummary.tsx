import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  api,
  type AttendanceHistory,
  ButtonLink,
  formatDuration,
  formatMinutesOfDay,
  formatMonth,
  minutesBetween,
  minutesOfDayInJakarta,
  MONTH_PAGE_SIZE,
  monthRange,
  Skeleton,
} from '@dexa/shared-ui';

function Stat({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="rounded-xl bg-surface px-3.5 py-3">
      <dt className="text-xs font-semibold text-ink-soft">{label}</dt>
      <dd className="text-xl font-extrabold">{value}</dd>
      {note && <dd className="text-xs text-ink-soft">{note}</dd>}
    </div>
  );
}

export function MonthSummary({
  today,
  dailyWorkMinutes,
}: {
  today: string;
  dailyWorkMinutes: number;
}) {
  const month = today.slice(0, 7);
  // The same query as the Riwayat page, so both share one cached copy.
  const { data, isPending, isError } = useQuery({
    queryKey: ['attendance-history', 'me', month],
    queryFn: () =>
      api.get<AttendanceHistory>('/attendance/me', {
        ...monthRange(month),
        limit: MONTH_PAGE_SIZE,
      }),
  });

  if (isError) return null;

  const records = data?.data ?? [];
  const finished = records.filter((record) => record.checkOutAt);
  const totalMinutes = finished.reduce(
    (sum, record) => sum + minutesBetween(record.checkInAt, record.checkOutAt!),
    0,
  );
  const late = records.filter((record) => record.status === 'LATE').length;
  const reachedTarget = finished.filter(
    (record) => minutesBetween(record.checkInAt, record.checkOutAt!) >= dailyWorkMinutes,
  ).length;
  const averageCheckIn = records.length
    ? records.reduce((sum, record) => sum + minutesOfDayInJakarta(record.checkInAt), 0) /
      records.length
    : null;

  return (
    <section
      aria-labelledby="month-title"
      className="rounded-2xl border border-line bg-paper px-5 pt-4 pb-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="month-title" className="font-bold">
          Ringkasan {formatMonth(month)}
        </h2>
        <ButtonLink to="/riwayat" variant="quiet" className="-mr-3 text-sm">
          Lihat riwayat
        </ButtonLink>
      </div>

      {isPending ? (
        <div aria-hidden="true" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} className="h-[76px] rounded-xl" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">
          Belum ada absensi bulan ini. Angkanya muncul setelah check-in pertama.
        </p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Hari hadir" value={records.length} note={`${late} terlambat`} />
          <Stat
            label="Total jam kerja"
            value={formatDuration(totalMinutes)}
            note={`${finished.length} hari lengkap`}
          />
          <Stat
            label="Target harian"
            value={`${reachedTarget}/${finished.length}`}
            note="hari tercapai"
          />
          <Stat
            label="Rata-rata masuk"
            value={averageCheckIn !== null ? formatMinutesOfDay(averageCheckIn) : '-'}
            note="WIB"
          />
        </dl>
      )}
    </section>
  );
}
