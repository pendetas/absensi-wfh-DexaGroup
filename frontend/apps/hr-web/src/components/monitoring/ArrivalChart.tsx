import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  type Arrival,
  Button,
  cn,
  formatMinutesOfDay,
  formatTime,
  gsap,
  minutesOfDayInJakarta,
  minutesOfTime,
  useGSAP,
} from '@dexa/shared-ui';

const DOT = 28;
const GAP = 3;
const AXIS_SPACE = 22;

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

interface PlacedDot extends Arrival {
  x: number;
  level: number;
  minutes: number;
}

/** One dot per check-in against the work start line, stacked where times are close. */
export function ArrivalChart({
  arrivals,
  workStartTime,
  notCheckedIn,
  animateKey,
  highlightedId,
  onHighlight,
  onPick,
  onShowMissing,
}: {
  arrivals: Arrival[];
  /** HH:mm, or null on a non-working day. */
  workStartTime: string | null;
  notCheckedIn: number | null;
  /** Dots drop in again when this changes, e.g. the date. */
  animateKey: string;
  highlightedId: number | null;
  onHighlight: (employeeId: number | null) => void;
  /** Shows this person in the list below. */
  onPick: (arrival: Arrival) => void;
  onShowMissing: () => void;
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const plot = plotRef.current;
    if (!plot) return;
    // Measured now, so the first paint has the right layout; the observer handles resizes.
    setWidth(plot.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(plot);
    return () => observer.disconnect();
  }, []);

  const start = workStartTime ? minutesOfTime(workStartTime) : null;

  const { dots, from, to, height, ticks } = useMemo(() => {
    const times = arrivals.map((arrival) => minutesOfDayInJakarta(arrival.checkInAt));
    const anchor = start ?? (times.length ? times[0] : 8 * 60);
    const earliest = Math.min(anchor - 60, ...times) - 5;
    const latest = Math.max(anchor + 60, ...times) + 5;
    // Hourly labels for a long day, half-hourly for a short one; the edges land on a label.
    // About 48px per label, so they never run together on a phone.
    const step =
      [30, 60, 120, 180].find(
        (candidate) => (latest - earliest) / candidate <= Math.max(width, 1) / 48,
      ) ?? 240;
    let low = Math.floor(earliest / step) * step;
    let high = Math.ceil(latest / step) * step;
    if (high - low < 180) {
      high += step;
      low -= step;
    }
    const usable = Math.max(width - DOT, 1);
    const x = (minutes: number) => DOT / 2 + ((minutes - low) / (high - low)) * usable;

    // Each dot takes the lowest level where it doesn't touch a neighbour.
    const placed: PlacedDot[] = [];
    [...arrivals]
      .map((arrival) => ({ ...arrival, minutes: minutesOfDayInJakarta(arrival.checkInAt) }))
      .sort((a, b) => a.minutes - b.minutes)
      .forEach((arrival) => {
        const px = x(arrival.minutes);
        let level = 0;
        while (placed.some((dot) => dot.level === level && Math.abs(dot.x - px) < DOT + GAP))
          level++;
        placed.push({ ...arrival, x: px, level });
      });
    const levels = placed.reduce((max, dot) => Math.max(max, dot.level + 1), 1);

    return {
      dots: placed,
      from: low,
      to: high,
      height: AXIS_SPACE + 8 + levels * (DOT + GAP) + 18,
      ticks: Array.from({ length: (high - low) / step + 1 }, (_, i) => ({
        minutes: low + i * step,
        x: x(low + i * step),
      })),
    };
  }, [arrivals, start, width]);

  useGSAP(
    () => {
      if (!width) return;
      gsap.fromTo(
        '[data-dot]',
        { y: -28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.035, ease: 'back.out(2)' },
      );
    },
    { scope: plotRef, dependencies: [animateKey, width > 0] },
  );

  const startX =
    start !== null && width ? DOT / 2 + ((start - from) / (to - from)) * (width - DOT) : null;
  const highlighted = dots.find((dot) => dot.employeeId === highlightedId);

  return (
    <section
      aria-labelledby="arrivals-title"
      className="rounded-xl border border-line bg-paper px-4 pt-3.5 pb-2.5 sm:px-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="arrivals-title" className="font-bold">
          Sebaran jam check-in
        </h2>
        <p className="text-sm text-ink-soft">
          Satu titik satu karyawan. Pilih titik untuk melihatnya di daftar.
        </p>
      </div>

      <div className="mt-2 grid gap-4 md:grid-cols-[1fr_9.5rem] md:items-end">
        <div ref={plotRef} className="relative" style={{ height }}>
          <div className="absolute inset-x-0 h-px bg-line-strong" style={{ bottom: AXIS_SPACE }} />
          {ticks.map((tick) => (
            <span
              key={tick.minutes}
              aria-hidden="true"
              className="absolute bottom-0 -translate-x-1/2 text-xs font-semibold text-ink-soft"
              style={{ left: tick.x }}
            >
              {formatMinutesOfDay(tick.minutes)}
            </span>
          ))}
          {startX !== null && (
            <div
              aria-hidden="true"
              className="absolute top-0 border-l-2 border-dashed border-brand"
              style={{ left: startX, bottom: AXIS_SPACE }}
            >
              <span className="absolute top-0 left-1.5 text-xs font-bold whitespace-nowrap text-brand">
                Jam masuk {workStartTime!.replace(':', '.')}
              </span>
            </div>
          )}

          {arrivals.length === 0 && (
            <p className="absolute inset-x-0 top-1/3 text-center text-sm text-ink-soft">
              Belum ada check-in pada tanggal ini.
            </p>
          )}

          <ul aria-label="Karyawan yang sudah check-in">
            {dots.map((dot) => {
              const late = dot.status === 'LATE';
              const lit = dot.employeeId === highlightedId;
              return (
                <li key={dot.employeeId}>
                  <button
                    type="button"
                    data-dot
                    aria-label={`${dot.fullName}, check-in ${formatTime(dot.checkInAt)}${late ? ', terlambat' : ''}. Tampilkan di daftar`}
                    onClick={() => onPick(dot)}
                    onPointerEnter={() => onHighlight(dot.employeeId)}
                    onPointerLeave={() => onHighlight(null)}
                    onFocus={() => onHighlight(dot.employeeId)}
                    onBlur={() => onHighlight(null)}
                    className={cn(
                      'absolute grid size-7 -translate-x-1/2 place-items-center rounded-full text-[10px] font-extrabold text-white',
                      'transition-[scale,box-shadow] duration-200 ease-out-soft hover:scale-125 active:scale-110',
                      late ? 'bg-warn' : 'bg-ok',
                      lit && 'z-10 scale-125 shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--color-ink)]',
                    )}
                    style={{ left: dot.x, bottom: AXIS_SPACE + 8 + dot.level * (DOT + GAP) }}
                  >
                    {initials(dot.fullName)}
                  </button>
                </li>
              );
            })}
          </ul>

          {highlighted && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-md bg-ink px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white"
              style={{
                left: highlighted.x,
                bottom: AXIS_SPACE + 8 + (highlighted.level + 1) * (DOT + GAP) + 6,
              }}
            >
              {highlighted.fullName}, {formatTime(highlighted.checkInAt)}
            </div>
          )}
        </div>

        {notCheckedIn !== null && (
          <div className="flex items-end justify-between gap-3 border-t border-line pt-3 md:block md:border-t-0 md:border-l md:pt-0 md:pb-6 md:pl-5">
            <div>
              <p className="text-[28px] leading-tight font-extrabold">{notCheckedIn}</p>
              <p className="text-sm font-semibold text-ink-soft">belum check-in</p>
            </div>
            {notCheckedIn > 0 && (
              <Button onClick={onShowMissing} className="md:mt-2">
                Lihat siapa
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
