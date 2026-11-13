import { type Attendance, minutesBetween } from '@dexa/shared-ui';

export type DayState =
  /** Checked in and out: a full working time is known. */
  | 'done'
  /** Today, still working: the time so far. */
  | 'running'
  /** A past day without check-out: no end time, so no duration is claimed. */
  | 'missed-checkout'
  /** A past working day with no check-in. */
  | 'absent'
  /** Today, not checked in yet. */
  | 'not-yet'
  /** Later this week. */
  | 'future';

export interface DayHours {
  date: string;
  state: DayState;
  /** Worked minutes, or null when unknown. */
  minutes: number | null;
  attendance: Attendance | null;
}

/** Working time of one day from its record: check-in to check-out, or to now while running. */
export function dayHours(
  date: string,
  today: string,
  attendance: Attendance | null,
  now: Date,
): DayHours {
  if (!attendance) {
    return {
      date,
      attendance,
      minutes: null,
      state: date > today ? 'future' : date === today ? 'not-yet' : 'absent',
    };
  }
  if (attendance.checkOutAt) {
    return {
      date,
      attendance,
      state: 'done',
      minutes: minutesBetween(attendance.checkInAt, attendance.checkOutAt),
    };
  }
  return date === today
    ? { date, attendance, state: 'running', minutes: minutesBetween(attendance.checkInAt, now) }
    : { date, attendance, state: 'missed-checkout', minutes: null };
}
