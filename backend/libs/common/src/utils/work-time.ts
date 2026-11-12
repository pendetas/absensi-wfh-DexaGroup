/** Wall-clock date and time at a fixed UTC offset, so results don't depend on the host timezone. */
export interface LocalDateTime {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm, 24-hour */
  time: string;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
}

const UTC_OFFSET_PATTERN = /^([+-])(\d{2}):(\d{2})$/;

export function offsetToMinutes(utcOffset: string): number {
  const match = UTC_OFFSET_PATTERN.exec(utcOffset);
  if (!match) throw new Error(`Invalid UTC offset "${utcOffset}", expected e.g. +07:00`);
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

export function toLocalDateTime(instant: Date, utcOffset: string): LocalDateTime {
  const shifted = new Date(instant.getTime() + offsetToMinutes(utcOffset) * 60_000);
  const iso = shifted.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16), dayOfWeek: shifted.getUTCDay() };
}

/** Day of week of a calendar date (YYYY-MM-DD), 0 = Sunday. */
export function dayOfWeekOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Accepts HH:mm or HH:mm:ss (MySQL TIME); seconds are ignored. */
export function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
