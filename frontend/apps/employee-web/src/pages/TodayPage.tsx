import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useRef, useState } from 'react';
import {
  api,
  type Attendance,
  AttendanceStatusBadge,
  AuthPhoto,
  Button,
  ButtonLink,
  errorMessages,
  formatClock,
  formatDuration,
  formatLongDate,
  formatTime,
  gsap,
  MOTION,
  minutesBetween,
  minutesOfDayInJakarta,
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
import { WeekStrip } from '../components/WeekStrip';
import { useServerClock } from '../lib/hooks';

// One block: the red clock band on top, today's attendance below, sharing edges and padding
// so every line of text starts at the same left edge.
const BLOCK =
  'overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_10px_30px_rgb(125_29_25/0.12)]';
const BAND = 'bg-brand px-5 pt-5 pb-5 text-white';
const CARD = 'px-5 py-5';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="text-xl font-extrabold">{children}</dd>
    </div>
  );
}

/** What the ruler shows, in a sentence. */
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
  const start =
    Number(today.workStartTime.slice(0, 2)) * 60 + Number(today.workStartTime.slice(3, 5));
  const gap = start - minutesOfDayInJakarta(now);
  if (gap > 0) return `${formatDuration(gap)} lagi sebelum jam masuk`;
  if (gap === 0) return 'Jam masuk sekarang';
  return `Lewat ${formatDuration(-gap)} dari jam masuk`;
}

/** Fades and lifts its content in when it first appears, e.g. right after a check-in. */
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

function CheckedIn({
  attendance,
  now,
  onCheckOut,
}: {
  attendance: Attendance;
  now: Date;
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
          <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <AttendanceStatusBadge status={attendance.status} attendance={attendance} />
            <span className="text-sm text-ink-soft">
              {attendance.checkOutAt
                ? `Bekerja ${formatDuration(minutesBetween(attendance.checkInAt, attendance.checkOutAt))}`
                : `Sudah ${formatDuration(minutesBetween(attendance.checkInAt, now))}`}
            </span>
          </div>
        </dl>
      </div>

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

/** The red band, card and week cells in their final shape, with placeholders inside. */
function TodaySkeleton() {
  return (
    <SkeletonScreen
      label="Memuat absensi hari ini"
      className="mx-auto flex max-w-xl flex-col gap-5"
    >
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
      <div>
        <Skeleton className="mb-2 h-4 w-24" />
        <div className="grid grid-cols-5 gap-1.5">
          {[0, 1, 2, 3, 4].map((day) => (
            <Skeleton key={day} className="h-[58px] rounded-lg" />
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}

/** The home screen: a clock on Dexa red, today's attendance and the one action that is next. */
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
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div className={BLOCK}>
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

      <WeekStrip today={data.date} />

      <CameraCapture mode={capture} now={() => clock} onClose={() => setCapture(null)} />
    </div>
  );
}
