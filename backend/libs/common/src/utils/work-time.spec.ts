import { dayOfWeekOf, minutesOfDay, offsetToMinutes, toLocalDateTime } from './work-time';

describe('offsetToMinutes', () => {
  it('parses positive, negative and half-hour offsets', () => {
    expect(offsetToMinutes('+07:00')).toBe(420);
    expect(offsetToMinutes('-05:00')).toBe(-300);
    expect(offsetToMinutes('+05:30')).toBe(330);
    expect(offsetToMinutes('+00:00')).toBe(0);
  });

  it('rejects anything that is not ±HH:MM', () => {
    expect(() => offsetToMinutes('Asia/Jakarta')).toThrow('Invalid UTC offset');
    expect(() => offsetToMinutes('7')).toThrow('Invalid UTC offset');
  });
});

describe('toLocalDateTime', () => {
  it('converts a UTC instant to Jakarta wall-clock time', () => {
    // Monday 9 Nov 2026, 01:30 UTC is 08:30 in Jakarta.
    expect(toLocalDateTime(new Date('2026-11-09T01:30:00Z'), '+07:00')).toEqual({
      date: '2026-11-09',
      time: '08:30',
      dayOfWeek: 1,
    });
  });

  it('rolls the date forward when Jakarta is already past midnight', () => {
    // Still Monday evening in UTC, but 00:30 on Tuesday in Jakarta.
    expect(toLocalDateTime(new Date('2026-11-09T17:30:00Z'), '+07:00')).toEqual({
      date: '2026-11-10',
      time: '00:30',
      dayOfWeek: 2,
    });
  });

  it('rolls the date back for negative offsets', () => {
    expect(toLocalDateTime(new Date('2026-01-01T02:00:00Z'), '-05:00')).toEqual({
      date: '2025-12-31',
      time: '21:00',
      dayOfWeek: 3,
    });
  });

  it('drops seconds rather than rounding them up', () => {
    expect(toLocalDateTime(new Date('2026-11-09T02:00:59Z'), '+07:00').time).toBe('09:00');
  });
});

describe('dayOfWeekOf', () => {
  it('returns 0 for Sunday through 6 for Saturday', () => {
    expect(dayOfWeekOf('2026-11-08')).toBe(0);
    expect(dayOfWeekOf('2026-11-09')).toBe(1);
    expect(dayOfWeekOf('2026-11-14')).toBe(6);
  });
});

describe('minutesOfDay', () => {
  it('reads HH:mm and ignores seconds', () => {
    expect(minutesOfDay('00:00')).toBe(0);
    expect(minutesOfDay('09:00')).toBe(540);
    expect(minutesOfDay('23:59:59')).toBe(1439);
  });
});
