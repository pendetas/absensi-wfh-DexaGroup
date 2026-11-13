import {
  type Attendance,
  AttendanceStatusBadge,
  AuthPhoto,
  cn,
  type DailyRow,
  DayTrack,
  describeLocation,
  formatDuration,
  formatTime,
  minutesBetween,
} from '@dexa/shared-ui';

export const ROW_GRID =
  'grid-cols-[3.25rem_minmax(0,1fr)] md:grid-cols-[3.25rem_minmax(0,1.25fr)_minmax(0,1.4fr)_minmax(0,1fr)_9.5rem]';

function Times({
  attendance,
  dailyWorkMinutes,
}: {
  attendance: Attendance;
  dailyWorkMinutes: number | null;
}) {
  const note = attendance.checkInNote ?? attendance.checkOutNote;
  const worked = attendance.checkOutAt
    ? minutesBetween(attendance.checkInAt, attendance.checkOutAt)
    : null;
  const short = worked !== null && dailyWorkMinutes !== null && worked < dailyWorkMinutes;
  // Same wording as the map panel, so the row and the map never disagree.
  const place = describeLocation(attendance.checkInLocation, attendance.checkInPlace);
  const detail = note ? `${place}, catatan: ${note}` : place;
  return (
    <span className="block min-w-0">
      <span className="font-bold">
        {formatTime(attendance.checkInAt)}
        <span className="font-normal text-ink-soft"> sampai </span>
        {attendance.checkOutAt ? (
          formatTime(attendance.checkOutAt)
        ) : (
          <>
            <span aria-hidden="true">-</span>
            <span className="sr-only">belum check-out</span>
          </>
        )}
      </span>
      {worked !== null && (
        <span className={cn('block text-xs font-semibold', short ? 'text-warn' : 'text-ok')}>
          {formatDuration(worked)}
          {short && `, kurang ${formatDuration(dailyWorkMinutes! - worked)}`}
        </span>
      )}
      <span className="block truncate text-xs text-ink-soft" title={detail}>
        {detail}
      </span>
    </span>
  );
}

/** Only a row with a check-in is a button; without one there are no photos to open. */
export function MonitoringRow({
  row,
  workStartTime,
  dailyWorkMinutes,
  isToday,
  highlighted,
  onHighlight,
  onOpen,
}: {
  row: DailyRow;
  workStartTime: string | null;
  /** Daily target for the "kurang" note; null until settings load. */
  dailyWorkMinutes: number | null;
  isToday: boolean;
  highlighted: boolean;
  onHighlight: (employeeId: number | null) => void;
  onOpen: (row: DailyRow) => void;
}) {
  const { employee, attendance } = row;
  const content = (
    <>
      {attendance ? (
        <AuthPhoto
          attendanceId={attendance.id}
          kind="check-in"
          alt={`Foto check-in ${employee.fullName}`}
          className="size-[52px] rounded-lg transition-transform duration-300 ease-out-soft group-hover:scale-105 group-hover:-rotate-2"
        />
      ) : (
        <span
          aria-hidden="true"
          className="size-[52px] rounded-lg border-2 border-dashed border-line-strong"
        />
      )}

      <span className="min-w-0">
        <span className="block truncate font-bold">
          <span className="bg-[linear-gradient(var(--color-brand),var(--color-brand))] bg-[length:0_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 ease-out-soft group-hover:bg-[length:100%_2px]">
            {employee.fullName}
          </span>
        </span>
        <span className="block truncate text-sm text-ink-soft">
          {employee.employeeCode}, {employee.department.name}
          {!employee.isActive && ' (nonaktif)'}
        </span>
      </span>

      {/* On a phone the badge gets its own line, so a long "Terlambat" never squeezes the name. */}
      <span className="col-start-2 md:order-last md:col-start-auto">
        <AttendanceStatusBadge status={row.status} attendance={attendance} />
      </span>

      <DayTrack
        attendance={attendance}
        workStartTime={attendance?.workStartTime ?? workStartTime}
        isToday={isToday}
        className="col-start-2 md:col-start-auto"
      />

      <span className="col-start-2 text-sm md:col-start-auto">
        {attendance ? (
          <Times attendance={attendance} dailyWorkMinutes={dailyWorkMinutes} />
        ) : (
          <span className="text-ink-soft">Tidak ada check-in</span>
        )}
      </span>
    </>
  );

  const classes = cn(
    `grid w-full ${ROW_GRID} items-center gap-x-4 gap-y-1.5 px-4 py-2.5 text-left transition-colors duration-200`,
    highlighted && 'bg-brand-wash',
  );

  return (
    <li
      data-mrow
      className="border-b border-line last:border-b-0"
      onPointerEnter={() => onHighlight(attendance ? employee.id : null)}
      onPointerLeave={() => onHighlight(null)}
    >
      {attendance ? (
        <button
          type="button"
          onClick={() => onOpen(row)}
          aria-label={`${employee.fullName}, lihat foto dan lokasi`}
          className={cn(classes, 'group hover:bg-brand-wash active:bg-brand-tint')}
        >
          {content}
        </button>
      ) : (
        <div className={classes}>{content}</div>
      )}
    </li>
  );
}
