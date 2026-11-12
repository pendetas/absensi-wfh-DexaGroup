import { useRef } from 'react';
import { gsap, minutesOfDayInJakarta, useGSAP } from '@dexa/shared-ui';

const FROM = 6 * 60;
const SPAN = 12 * 60;
const HOURS = Array.from({ length: 13 }, (_, index) => 6 + index);
const pct = (minutes: number) => Math.min(100, Math.max(0, ((minutes - FROM) / SPAN) * 100));

/** A recorded moment on the ruler. Drops into place when it first appears. */
function Marker({ minutes, label }: { minutes: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.fromTo(
        ref.current,
        { y: -16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, delay: 0.2, ease: 'back.out(3)' },
      );
    },
    { scope: ref },
  );
  return (
    <div
      ref={ref}
      className="absolute top-2.5 h-[22px] w-1 -translate-x-1/2 rounded-sm bg-ink"
      style={{ left: `${pct(minutes)}%` }}
      title={label}
    />
  );
}

/**
 * 06.00 to 18.00 under the clock: now as a white dot, the work start time as a dashed line,
 * and today's check-in and check-out as dark marks. The sentence below it says the same in
 * words, so nothing depends on reading the ruler.
 */
export function DayRuler({
  now,
  workStartTime,
  checkInAt,
  checkOutAt,
}: {
  now: Date;
  /** HH:mm, or null on a non-working day. */
  workStartTime: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
}) {
  const start = workStartTime
    ? Number(workStartTime.slice(0, 2)) * 60 + Number(workStartTime.slice(3, 5))
    : null;
  const nowMinutes = minutesOfDayInJakarta(now) + now.getUTCSeconds() / 60;

  return (
    <div aria-hidden="true" className="relative mt-5 h-12">
      <div className="absolute inset-x-0 top-[21px] h-0.5 rounded bg-white/35" />
      {HOURS.map((hour) => (
        <div key={hour}>
          <div
            className="absolute top-4 h-2 w-px bg-white/45"
            style={{ left: `${pct(hour * 60)}%` }}
          />
          {hour % 3 === 0 && (
            <span
              className="absolute top-7 -translate-x-1/2 text-[11px] font-semibold text-white/90"
              style={{ left: `${pct(hour * 60)}%` }}
            >
              {String(hour).padStart(2, '0')}
            </span>
          )}
        </div>
      ))}
      {start !== null && (
        <div
          className="absolute -top-1 bottom-4 border-l-2 border-dashed border-white"
          style={{ left: `${pct(start)}%` }}
        >
          <span className="absolute -top-1.5 left-1.5 rounded-sm bg-white px-1.5 text-[11px] font-bold whitespace-nowrap text-brand-strong">
            Jam masuk {workStartTime!.replace(':', '.')}
          </span>
        </div>
      )}
      {checkInAt && <Marker minutes={minutesOfDayInJakarta(checkInAt)} label="Check-in" />}
      {checkOutAt && <Marker minutes={minutesOfDayInJakarta(checkOutAt)} label="Check-out" />}
      <div
        className="absolute top-[14px] size-4 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_4px_rgb(255_255_255/0.25)] transition-[left] duration-1000 ease-linear"
        style={{ left: `${pct(nowMinutes)}%` }}
      />
    </div>
  );
}
