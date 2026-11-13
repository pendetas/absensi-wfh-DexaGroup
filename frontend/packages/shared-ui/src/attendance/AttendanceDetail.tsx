import { useMemo } from 'react';
import { AuthPhoto } from '../components/AuthPhoto';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { LocationMap, type MapPoint } from '../components/LocationMap';
import { AttendanceStatusBadge } from '../components/StatusBadge';
import { formatDuration, formatLongDate, formatTime, mapUrl, minutesBetween } from '../lib/format';
import { canShowOnMap, describeLocation } from '../lib/location';
import type { Attendance, GeoLocation, PhotoKind } from '../lib/types';

function LocationLine({ location, place }: { location: GeoLocation | null; place: string | null }) {
  const text = describeLocation(location, place);
  if (!canShowOnMap(location)) {
    return (
      <p className="flex items-start gap-1.5 text-sm text-ink-soft">
        <span className="mt-0.5">
          <Icon name="pin" size={16} />
        </span>
        {location ? `${text}. Perangkat hanya menebak dari koneksi internet.` : text}
      </p>
    );
  }
  return (
    <p className="flex items-start gap-1.5 text-sm">
      <span className="mt-0.5 text-ink-soft">
        <Icon name="pin" size={16} />
      </span>
      <span>
        <span className="font-semibold">{text}</span>{' '}
        <a
          href={mapUrl(location.latitude, location.longitude)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center whitespace-nowrap text-ink-soft underline underline-offset-2 hover:text-brand sm:min-h-0"
        >
          Buka di Google Maps
          <span className="sr-only"> (tab baru)</span>
        </a>
      </span>
    </p>
  );
}

const CHECK_IN_COLOR = '#a52823';
const CHECK_OUT_COLOR = '#1c1c1e';

/** Check-in and check-out on one map, for whichever had a location. */
function DayMap({ attendance }: { attendance: Attendance }) {
  const points = useMemo(() => {
    const result: MapPoint[] = [];
    if (canShowOnMap(attendance.checkInLocation)) {
      result.push({
        id: 'check-in',
        ...attendance.checkInLocation,
        color: CHECK_IN_COLOR,
        label: `Check-in ${formatTime(attendance.checkInAt)}`,
      });
    }
    if (attendance.checkOutAt && canShowOnMap(attendance.checkOutLocation)) {
      result.push({
        id: 'check-out',
        ...attendance.checkOutLocation,
        color: CHECK_OUT_COLOR,
        label: `Check-out ${formatTime(attendance.checkOutAt)}`,
      });
    }
    return result;
  }, [attendance]);

  if (points.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h3 className="font-bold">Lokasi di peta</h3>
        <p className="flex gap-4 text-sm text-ink-soft">
          {points.map((point) => (
            <span key={point.id} className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: point.color }}
                aria-hidden="true"
              />
              {point.id === 'check-in' ? 'Check-in' : 'Check-out'}
            </span>
          ))}
        </p>
      </div>
      <LocationMap points={points} className="h-56 sm:h-64" />
    </section>
  );
}

function Moment({
  attendance,
  kind,
  subject,
}: {
  attendance: Attendance;
  kind: PhotoKind;
  subject: string;
}) {
  const isCheckIn = kind === 'check-in';
  const title = isCheckIn ? 'Check-in' : 'Check-out';
  const time = isCheckIn ? attendance.checkInAt : attendance.checkOutAt;
  const note = isCheckIn ? attendance.checkInNote : attendance.checkOutNote;
  const location = isCheckIn ? attendance.checkInLocation : attendance.checkOutLocation;
  const place = isCheckIn ? attendance.checkInPlace : attendance.checkOutPlace;

  if (!time) {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="font-bold">{title}</h3>
        <p className="flex aspect-[4/3] items-center justify-center rounded border border-dashed border-line-strong p-4 text-center text-sm text-ink-soft">
          Belum check-out. Absensi hanya bisa ditutup pada hari yang sama.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">
          {title} <span className="tabular-nums">{formatTime(time)} WIB</span>
        </h3>
        {isCheckIn && <AttendanceStatusBadge status={attendance.status} attendance={attendance} />}
      </div>
      <AuthPhoto
        attendanceId={attendance.id}
        kind={kind}
        alt={`Foto ${title.toLowerCase()} ${subject}`}
        fit="contain"
        className="aspect-[4/3] w-full"
      />
      <LocationLine location={location} place={place} />
      <p className="text-sm">
        <span className="text-ink-soft">Catatan: </span>
        {note ?? <span className="text-ink-soft">tidak ada</span>}
      </p>
    </section>
  );
}

export function AttendanceDetailDialog({
  attendance,
  employeeName,
  onClose,
}: {
  /** null keeps the dialog closed. */
  attendance: Attendance | null;
  employeeName: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={attendance !== null}
      onClose={onClose}
      title={attendance ? formatLongDate(attendance.attendanceDate) : ''}
      fullScreenOnPhone
      drawer
    >
      {attendance && (
        <div className="flex flex-col gap-4">
          <p>
            <span className="font-semibold">{employeeName}</span>
            {attendance.checkOutAt && (
              <span className="text-ink-soft">
                {' '}
                · bekerja{' '}
                {formatDuration(minutesBetween(attendance.checkInAt, attendance.checkOutAt))}
              </span>
            )}
            {attendance.workStartTime && (
              <span className="text-ink-soft">
                {' '}
                · jam masuk saat itu {attendance.workStartTime.replace(':', '.')}
              </span>
            )}
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <Moment attendance={attendance} kind="check-in" subject={employeeName} />
            <Moment attendance={attendance} kind="check-out" subject={employeeName} />
          </div>
          <DayMap attendance={attendance} />
        </div>
      )}
    </Dialog>
  );
}
