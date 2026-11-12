import { AttendanceStatus } from '@app/common';
import { evaluateCheckIn, isWorkingDay } from './attendance.rules';

const MONDAY = 1;
const SATURDAY = 6;
const SUNDAY = 0;

const at = (time: string, dayOfWeek = MONDAY) => ({ date: '2026-11-09', time, dayOfWeek });

describe('isWorkingDay', () => {
  it('is true Monday to Friday only', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(isWorkingDay)).toEqual([
      false,
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
  });
});

describe('evaluateCheckIn', () => {
  it('is on time before the start time', () => {
    expect(evaluateCheckIn(at('08:59'), '09:00')).toEqual({
      status: AttendanceStatus.ON_TIME,
      lateMinutes: 0,
      workStartTime: '09:00',
    });
  });

  it('is on time during the start minute itself (no grace period, but 09:00:59 counts)', () => {
    expect(evaluateCheckIn(at('09:00'), '09:00').status).toBe(AttendanceStatus.ON_TIME);
  });

  it('is late from the next minute, counted in minutes', () => {
    expect(evaluateCheckIn(at('09:01'), '09:00')).toMatchObject({
      status: AttendanceStatus.LATE,
      lateMinutes: 1,
    });
    expect(evaluateCheckIn(at('14:30'), '09:00').lateMinutes).toBe(330);
  });

  it('follows whatever start time HR has set', () => {
    expect(evaluateCheckIn(at('09:30'), '10:00').status).toBe(AttendanceStatus.ON_TIME);
    expect(evaluateCheckIn(at('07:45'), '07:30').status).toBe(AttendanceStatus.LATE);
  });

  it('accepts the HH:mm:ss form MySQL returns and snapshots it as HH:mm', () => {
    expect(evaluateCheckIn(at('09:05'), '09:00:00')).toEqual({
      status: AttendanceStatus.LATE,
      lateMinutes: 5,
      workStartTime: '09:00',
    });
  });

  it.each([SATURDAY, SUNDAY])('applies no late rule on day %i', (dayOfWeek) => {
    expect(evaluateCheckIn(at('13:00', dayOfWeek), '09:00')).toEqual({
      status: AttendanceStatus.OFF_DAY,
      lateMinutes: 0,
      workStartTime: null,
    });
  });
});
