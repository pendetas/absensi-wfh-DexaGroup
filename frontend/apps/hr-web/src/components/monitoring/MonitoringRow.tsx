import {
  type Attendance,
  AttendanceStatusBadge,
  AuthPhoto,
  cn,
  type DailyRow,
  DayTrack,
  formatTime,
} from '@dexa/shared-ui';

export const ROW_GRID =
  'grid-cols-[3.25rem_minmax(0,1fr)_auto] md:grid-cols-[3.25rem_minmax(0,1.25fr)_minmax(0,1.4fr)_minmax(0,1fr)_9.5rem]';

function Times({ attendance }: { attendance: Attendance }) {
  const note = attendance.checkInNote ?? attendance.checkOutNote;
  return (
    <span className="block min-w-0">
      <span className="font-bold">
        {formatTime(attendance.checkInAt)}
        <span className="font-normal text-ink-soft"> sampai </span>
        {attendance.checkOutAt ? formatTime(attendance.checkOutAt) : 'belum'}
      </span>
      <span className="block truncate text-xs text-ink-soft">
        {attendance.checkInLocation ? 'Lokasi ada' : 'Tanpa lokasi'}
        {note && `, catatan: ${note}`}
      </span>
    </span>
  );
}

/**
 * One employee on the date. A row with a check-in is a button that opens the photos; a row
 * without one is plain text, since there is nothing to open.
 */
export function MonitoringRow({
  row,
  workStartTime,
  isToday,
  highlighted,
  onHighlight,
  onOpen,
}: {
  row: DailyRow;
  workStartTime: string | null;
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

      <span className="justify-self-end md:order-last md:justify-self-start">
        <AttendanceStatusBadge status={row.status} attendance={attendance} />
      </span>

      <DayTrack
        attendance={attendance}
        workStartTime={attendance?.workStartTime ?? workStartTime}
        isToday={isToday}
        className="col-span-2 col-start-2 md:col-span-1 md:col-start-auto"
      />

      <span className="col-span-2 col-start-2 text-sm md:col-span-1 md:col-start-auto">
        {attendance ? (
          <Times attendance={attendance} />
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
