/** Everything is shown in Jakarta time (WIB), whatever the device is set to. */
const TIME_ZONE = 'Asia/Jakarta';
const LOCALE = 'id-ID';

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});
const clockFormat = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: TIME_ZONE,
});
// Calendar dates (YYYY-MM-DD) carry no time, so they are formatted as UTC to avoid shifting.
const longDateFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'full', timeZone: 'UTC' });
const mediumDateFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
});

const asUtcDate = (date: string) => new Date(`${date}T00:00:00Z`);

/** "08.31", the Indonesian way of writing a time. */
export const formatTime = (instant: string | Date) => timeFormat.format(new Date(instant));
export const formatClock = (instant: Date) => clockFormat.format(instant);
/** "10 Nov 2026 08.31" */
export const formatDateTime = (instant: string | Date) => dateTimeFormat.format(new Date(instant));
/** "Selasa, 10 November 2026" */
export const formatLongDate = (date: string) => longDateFormat.format(asUtcDate(date));
/** "10 Nov 2026" */
export const formatDate = (date: string) => mediumDateFormat.format(asUtcDate(date));
/** "November 2026" from "2026-11" */
export const formatMonth = (month: string) => monthFormat.format(asUtcDate(`${month}-01`));
/** "09.00" from the API's "09:00" */
export const formatWorkStart = (time: string) => time.replace(':', '.');
/** 540 from "09:00" */
export const minutesOfTime = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** "09.05" from 545, a minute of the day. */
export function formatMinutesOfDay(minutes: number): string {
  const rounded = Math.round(minutes);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(rounded / 60))}.${pad(rounded % 60)}`;
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} mnt`;
  return minutes === 0 ? `${hours} jam` : `${hours} jam ${minutes} mnt`;
}

/** "8j 12m", for narrow places such as chart labels. */
export function formatDurationShort(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}j` : `${hours}j ${minutes}m`;
}

export function minutesBetween(start: string | Date, end: string | Date): number {
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60_000));
}

/** Minutes since midnight in Jakarta, e.g. 08.31 is 511. */
export function minutesOfDayInJakarta(instant: string | Date): number {
  const shifted = new Date(new Date(instant).getTime() + 7 * 60 * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** Monday of the week containing `date` (YYYY-MM-DD). */
export function mondayOf(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

/** Today's calendar date in Jakarta as YYYY-MM-DD. */
export function todayInJakarta(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60_000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const result = asUtcDate(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function addMonths(month: string, months: number): string {
  const result = asUtcDate(`${month}-01`);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result.toISOString().slice(0, 7);
}

/** First and last day of a month ("2026-11") for a history query. */
export function monthRange(month: string): { from: string; to: string } {
  const lastDay = asUtcDate(`${addMonths(month, 1)}-01`);
  lastDay.setUTCDate(0);
  return { from: `${month}-01`, to: lastDay.toISOString().slice(0, 10) };
}

export function mapUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
