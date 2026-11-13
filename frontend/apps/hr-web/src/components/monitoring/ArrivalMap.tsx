import { useMemo, useState } from 'react';
import {
  type Arrival,
  Button,
  canShowOnMap,
  cn,
  describeLocation,
  formatTime,
  LocationMap,
  type MapPoint,
} from '@dexa/shared-ui';

const STORAGE_KEY = 'dexa-hr-map-open';

const STATUS_COLOR: Record<Arrival['status'], string> = {
  ON_TIME: '#2e8b57',
  LATE: '#c98a12',
  OFF_DAY: '#55555a',
};

function readOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function saveOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(open));
  } catch {
    // Private windows may block storage; the toggle still works for this visit.
  }
}

/** Informational only: work from anywhere is allowed. The list beside it says the same in words. */
export function ArrivalMap({
  arrivals,
  onPick,
}: {
  arrivals: Arrival[];
  /** Shows this person in the list below. */
  onPick: (arrival: Arrival) => void;
}) {
  const [open, setOpen] = useState(readOpen);

  const points = useMemo<MapPoint[]>(
    () =>
      arrivals.flatMap((arrival) =>
        canShowOnMap(arrival.location)
          ? [
              {
                id: arrival.employeeId,
                ...arrival.location,
                color: STATUS_COLOR[arrival.status],
                label: `${arrival.fullName}, ${formatTime(arrival.checkInAt)}`,
              },
            ]
          : [],
      ),
    [arrivals],
  );
  const pointsById = useMemo(
    () => new Map(arrivals.map((arrival) => [arrival.employeeId, arrival])),
    [arrivals],
  );

  if (arrivals.length === 0) return null;
  const notOnMap = arrivals.length - points.length;

  function toggle() {
    setOpen(!open);
    saveOpen(!open);
  }

  return (
    <section
      aria-labelledby="arrival-map-title"
      className="rounded-xl border border-line bg-paper px-4 py-3.5 sm:px-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="arrival-map-title" className="font-bold">
            Lokasi check-in
          </h2>
          <p className="text-sm text-ink-soft">
            {points.length} di peta
            {notOnMap > 0 && `, ${notOnMap} tanpa lokasi yang pasti`}
          </p>
        </div>
        <Button icon="pin" aria-expanded={open} aria-controls="arrival-map-body" onClick={toggle}>
          {open ? 'Sembunyikan peta' : 'Tampilkan peta'}
        </Button>
      </div>

      {open && (
        <div id="arrival-map-body" className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <LocationMap
            points={points}
            className="h-64 sm:h-80"
            onPointClick={(point) => {
              const arrival = pointsById.get(Number(point.id));
              if (arrival) onPick(arrival);
            }}
          />
          <ul className="flex max-h-80 flex-col overflow-y-auto" aria-label="Lokasi per karyawan">
            {arrivals.map((arrival) => {
              const shown = canShowOnMap(arrival.location);
              return (
                <li key={arrival.employeeId} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onPick(arrival)}
                    className="flex min-h-11 w-full items-start gap-2.5 py-2 text-left hover:bg-surface"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 size-2.5 shrink-0 rounded-full',
                        !shown && 'border border-line-strong',
                      )}
                      style={shown ? { backgroundColor: STATUS_COLOR[arrival.status] } : undefined}
                    />
                    <span className="min-w-0 text-sm">
                      <span className="font-semibold">{arrival.fullName}</span>{' '}
                      <span className="text-ink-soft tabular-nums">
                        {formatTime(arrival.checkInAt)}
                      </span>
                      <span className={cn('block', shown ? 'text-ink' : 'text-ink-soft')}>
                        {describeLocation(arrival.location, arrival.place)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
