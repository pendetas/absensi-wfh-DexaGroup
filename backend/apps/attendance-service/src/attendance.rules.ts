import { AttendanceStatus, LocalDateTime, minutesOfDay } from '@app/common';

const SUNDAY = 0;
const SATURDAY = 6;

export function isWorkingDay(dayOfWeek: number): boolean {
  return dayOfWeek !== SATURDAY && dayOfWeek !== SUNDAY;
}

export interface CheckInEvaluation {
  status: AttendanceStatus;
  lateMinutes: number;
  /** HH:mm the check-in was judged against; null when no rule applied. */
  workStartTime: string | null;
}

/** No grace period: 09:00:59 is on time for a 09:00 start, 09:01:00 is one minute late. */
export function evaluateCheckIn(local: LocalDateTime, workStartTime: string): CheckInEvaluation {
  if (!isWorkingDay(local.dayOfWeek)) {
    return { status: AttendanceStatus.OFF_DAY, lateMinutes: 0, workStartTime: null };
  }
  const lateMinutes = Math.max(0, minutesOfDay(local.time) - minutesOfDay(workStartTime));
  return {
    status: lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.ON_TIME,
    lateMinutes,
    workStartTime: workStartTime.slice(0, 5),
  };
}
