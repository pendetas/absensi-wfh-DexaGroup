import { AuthPhoto } from '../components/AuthPhoto';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { AttendanceStatusBadge } from '../components/StatusBadge';
import { formatDuration, formatLongDate, formatTime, mapUrl, minutesBetween } from '../lib/format';
import type { Attendance, GeoLocation, PhotoKind } from '../lib/types';

function LocationLine({ location }: { location: GeoLocation | null }) {
  if (!location) return <p className="text-sm text-ink-soft">Lokasi tidak dibagikan.</p>;
  return (
    <p className="text-sm">
      <a
        href={mapUrl(location.latitude, location.longitude)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 font-semibold underline underline-offset-2 hover:text-brand sm:min-h-0"
      >
        <Icon name="pin" size={16} />
        Lihat lokasi di peta
        <span className="sr-only">(tab baru)</span>
      </a>
      {location.accuracyMeters !== null && (
        <span className="text-ink-soft"> (akurasi sekitar {location.accuracyMeters} m)</span>
      )}
    </p>
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
      <LocationLine location={location} />
      <p className="text-sm">
        <span className="text-ink-soft">Catatan: </span>
        {note ?? <span className="text-ink-soft">tidak ada</span>}
      </p>
    </section>
  );
}

/** Both photos of one day with their time, location and note: the evidence HR reviews. */
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
        </div>
      )}
    </Dialog>
  );
}
