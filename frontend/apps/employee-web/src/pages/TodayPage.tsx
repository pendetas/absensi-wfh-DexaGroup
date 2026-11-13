import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useRef, useState } from 'react';
import {
  api,
  type Attendance,
  AttendanceStatusBadge,
  AuthPhoto,
  Button,
  ButtonLink,
  cn,
  errorMessages,
  formatClock,
  formatDuration,
  formatLongDate,
  formatTime,
  gsap,
  MOTION,
  minutesBetween,
  minutesOfDayInJakarta,
  minutesOfTime,
  Panel,
  Skeleton,
  SkeletonScreen,
  StateMessage,
  type TodayAttendance,
  useCurrentUser,
  useGSAP,
} from '@dexa/shared-ui';
import { CameraCapture, type CaptureMode } from '../components/CameraCapture';
import { DayRuler } from '../components/DayRuler';
import { MonthSummary } from '../components/MonthSummary';
import { WeekHours } from '../components/WeekHours';
import { useServerClock } from '../lib/hooks';

// Band and card share edges and padding, so every line of text starts at the same left edge.
const BLOCK =
  'overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_10px_30px_rgb(125_29_25/0.12)]';
const BAND = 'bg-brand px-5 pt-5 pb-5 text-white';
const LAYOUT =
  'mx-auto flex max-w-xl flex-col gap-5 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start';
const CARD = 'px-5 py-5';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="text-xl font-extrabold">{children}</dd>
    </div>
  );
}

/** The ruler in words, for anyone who can't read it. */
function rulerSentence(today: TodayAttendance, now: Date): string {
  const { attendance } = today;
  if (attendance) {
    if (attendance.status === 'OFF_DAY')
      return `Check-in ${formatTime(attendance.checkInAt)}, hari libur`;
    const gap = attendance.lateMinutes;
    return gap > 0
      ? `Check-in ${formatTime(attendance.checkInAt)}, terlambat ${formatDuration(gap)}`
      : `Check-in ${formatTime(attendance.checkInAt)}, tepat waktu`;
  }
  if (!today.isWorkingDay) return 'Hari ini bukan hari kerja. Check-in tetap bisa.';
  const start = minutesOfTime(today.workStartTime);
  const gap = start - minutesOfDayInJakarta(now);
  if (gap > 0) return `${formatDuration(gap)} lagi sebelum jam masuk`;
  if (gap === 0) return 'Jam masuk sekarang';
  return `Lewat ${formatDuration(-gap)} dari jam masuk`;
}

function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.fromTo(
        ref.current!.children,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: MOTION.enter, stagger: 0.06, ease: MOTION.ease },
      );
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className="flex flex-col gap-3">
      {children}
    </div>
  );
}

function NotCheckedIn({ firstName, onCheckIn }: { firstName: string; onCheckIn: () => void }) {
  return (
    <Reveal>
      <p className="text-base font-bold">{firstName}, Anda belum check-in hari ini.</p>
      <Button variant="primary" size="lg" icon="camera" block onClick={onCheckIn}>
        Check-in sekarang
      </Button>
      <p className="text-sm text-ink-soft">
        Kamera terbuka untuk foto bukti. Lokasi ikut dicatat jika Anda mengizinkannya.
      </p>
    </Reveal>
  );
}

/** Today's working time against the daily target, with when it will be reached. */
function TodayProgress({
  attendance,
  now,
  dailyWorkMinutes,
}: {
  attendance: Attendance;
  now: Date;
  dailyWorkMinutes: number;
}) {
  const end = attendance.checkOutAt ?? now;
  const worked = minutesBetween(attendance.checkInAt, end);
  const reached = worked >= dailyWorkMinutes;
  const reachAt = new Date(new Date(attendance.checkInAt).getTime() + dailyWorkMinutes * 60_000);
  const sentence = attendance.checkOutAt
    ? reached
      ? 'Target jam kerja hari ini tercapai.'
      : `Kurang ${formatDuration(dailyWorkMinutes - worked)} dari target.`
    : reached
      ? 'Target tercapai. Jangan lupa check-out.'
      : `Target tercapai pukul ${formatTime(reachAt)} WIB.`;

  return (
    <div className="rounded-xl bg-surface px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-sm font-semibold whitespace-nowrap text-ink-soft">
          {attendance.checkOutAt ? 'Jam kerja hari ini' : 'Sudah bekerja'}
        </p>
        <p className="text-sm whitespace-nowrap text-ink-soft">
          <span className="text-lg font-extrabold text-ink">{formatDuration(worked)}</span> /{' '}
          {formatDuration(dailyWorkMinutes)}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Jam kerja hari ini dibanding target"
        aria-valuemin={0}
        aria-valuemax={dailyWorkMinutes}
        aria-valuenow={Math.min(worked, dailyWorkMinutes)}
        aria-valuetext={`${formatDuration(worked)} dari ${formatDuration(dailyWorkMinutes)}`}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-line"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-1000 ease-linear',
            reached ? 'bg-ok-mark' : attendance.checkOutAt ? 'bg-warn-mark' : 'bg-brand',
          )}
          style={{ width: `${Math.min(100, (worked / dailyWorkMinutes) * 100)}%` }}
        />
      </div>
      <p className={cn('mt-1.5 text-sm', reached ? 'text-ok' : 'text-ink-soft')}>{sentence}</p>
    </div>
  );
}

function CheckedIn({
  attendance,
  now,
  dailyWorkMinutes,
  onCheckOut,
}: {
  attendance: Attendance;
  now: Date;
  dailyWorkMinutes: number;
  onCheckOut: () => void;
}) {
  return (
    <Reveal>
      <div className="flex items-start gap-4">
        <AuthPhoto
          attendanceId={attendance.id}
          kind="check-in"
          alt="Foto check-in hari ini"
          className="aspect-square w-24 shrink-0 rounded-lg"
        />
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2">
          <Fact label="Check-in">{formatTime(attendance.checkInAt)}</Fact>
          <Fact label="Check-out">
            {attendance.checkOutAt ? formatTime(attendance.checkOutAt) : 'Belum'}
          </Fact>
          <div className="col-span-2">
            <AttendanceStatusBadge status={attendance.status} attendance={attendance} />
          </div>
        </dl>
      </div>

      <TodayProgress attendance={attendance} now={now} dailyWorkMinutes={dailyWorkMinutes} />

      {attendance.checkOutAt ? (
        <>
          <p className="font-bold">Absensi hari ini sudah lengkap.</p>
          <ButtonLink to="/riwayat" icon="list" block>
            Lihat riwayat absensi
          </ButtonLink>
        </>
      ) : (
        <>
          <Button variant="primary" size="lg" icon="camera" block onClick={onCheckOut}>
            Check-out
          </Button>
          <p className="text-sm text-ink-soft">
            Check-out hanya bisa hari ini. Setelah tengah malam, absensi tercatat tanpa check-out.
          </p>
        </>
      )}
    </Reveal>
  );
}

function TodaySkeleton() {
  return (
    <SkeletonScreen label="Memuat absensi hari ini" className={LAYOUT}>
      <div className={BLOCK}>
        <div className={BAND}>
          <Skeleton onBrand className="h-4 w-48" />
          <Skeleton onBrand className="mt-3 h-14 w-56" />
          <Skeleton onBrand className="mt-6 h-2 w-full rounded-full" />
          <Skeleton onBrand className="mt-6 h-4 w-52" />
        </div>
        <div className={CARD}>
          <Skeleton className="h-5 w-64 max-w-full" />
          <Skeleton className="mt-3 h-14 rounded-lg" />
          <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-line bg-paper px-5 py-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-8 w-48" />
          <Skeleton className="mt-2 h-2 w-full rounded-full" />
          <div className="mt-6 grid h-32 grid-cols-5 items-end gap-2">
            {['h-1/2', 'h-3/4', 'h-2/3', 'h-1/3', 'h-1/4'].map((height) => (
              <Skeleton key={height} className={`rounded-t-lg ${height}`} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-paper px-5 py-5">
          <Skeleton className="h-4 w-44" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((tile) => (
              <Skeleton key={tile} className="h-[76px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}

export function TodayPage() {
  const { employee } = useCurrentUser();
  const [capture, setCapture] = useState<CaptureMode | null>(null);
  const bandRef = useRef<HTMLDivElement>(null);

  const { data, error, isPending, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get<TodayAttendance>('/attendance/today'),
    // Picks up a new work date when the page is left open past midnight.
    refetchInterval: 5 * 60_000,
  });
  const now = useServerClock(data?.serverTime, dataUpdatedAt);

  // The band settles in once, when the page first has data.
  useGSAP(
    () => {
      if (!data) return;
      gsap.fromTo(
        bandRef.current!.children,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: MOTION.enter, stagger: 0.07, ease: MOTION.ease },
      );
    },
    { scope: bandRef, dependencies: [Boolean(data)] },
  );

  if (isPending) return <TodaySkeleton />;
  if (error) {
    return (
      <Panel>
        <StateMessage
          title="Absensi hari ini gagal dimuat"
          action={
            <Button icon="refresh" loading={isFetching} onClick={() => void refetch()}>
              Coba lagi
            </Button>
          }
        >
          {errorMessages(error)[0]}
        </StateMessage>
      </Panel>
    );
  }

  const { attendance } = data;
  const clock = now ?? new Date(data.serverTime);
  const [hoursMinutes, seconds] = [formatClock(clock).slice(0, 5), formatClock(clock).slice(5)];

  return (
    <div className={LAYOUT}>
      {/* Stays in view on wide screens while the week and month scroll beside it. */}
      <div className={cn(BLOCK, 'lg:sticky lg:top-20')}>
        <div ref={bandRef} className={BAND}>
          <h1 className="font-semibold text-white/90">{formatLongDate(data.date)}</h1>
          <p className="text-[56px] leading-none font-extrabold tracking-tight">
            <span className="sr-only">Waktu server sekarang </span>
            {hoursMinutes}
            <span className="text-white/60">{seconds}</span>{' '}
            <span className="text-base font-bold tracking-normal text-white/90">WIB</span>
          </p>
          <DayRuler
            now={clock}
            workStartTime={data.isWorkingDay ? data.workStartTime : null}
            checkInAt={attendance?.checkInAt ?? null}
            checkOutAt={attendance?.checkOutAt ?? null}
          />
          <p className="text-sm font-semibold">{rulerSentence(data, clock)}</p>
        </div>

        <section className={CARD} aria-live="polite">
          {/* Keyed by state, so the card's content re-enters when a check-in or out lands. */}
          {attendance ? (
            <CheckedIn
              key={attendance.checkOutAt ? 'done' : 'in'}
              attendance={attendance}
              now={clock}
              dailyWorkMinutes={data.dailyWorkMinutes}
              onCheckOut={() => setCapture('check-out')}
            />
          ) : (
            <NotCheckedIn
              key="none"
              firstName={employee.fullName.split(' ')[0]}
              onCheckIn={() => setCapture('check-in')}
            />
          )}
        </section>
      </div>

      <div className="flex flex-col gap-5">
        <WeekHours today={data.date} now={clock} dailyWorkMinutes={data.dailyWorkMinutes} />
        <MonthSummary today={data.date} dailyWorkMinutes={data.dailyWorkMinutes} />
      </div>

      <CameraCapture mode={capture} now={() => clock} onClose={() => setCapture(null)} />
    </div>
  );
}
