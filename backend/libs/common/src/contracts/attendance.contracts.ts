import type { Paginated } from './employee.contracts';

export enum AttendanceStatus {
  ON_TIME = 'ON_TIME',
  LATE = 'LATE',
  /** Checked in on a non-working day; the late rule doesn't apply. */
  OFF_DAY = 'OFF_DAY',
}

/** Row status in HR's daily view: an attendance status, or no record on a working day. */
export const NOT_CHECKED_IN = 'NOT_CHECKED_IN';
export type DailyStatus = AttendanceStatus | typeof NOT_CHECKED_IN;

export enum PhotoKind {
  CHECK_IN = 'check-in',
  CHECK_OUT = 'check-out',
}

/** Position reported by the device. Evidence for HR only; never used to refuse a check-in. */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  /** Radius of uncertainty in metres, when the device reports one. */
  accuracyMeters: number | null;
}

interface AttendanceProof {
  photoBase64: string;
  note?: string;
  /** Absent when the employee did not share their location. */
  location?: GeoLocation;
}

export interface CheckInPayload extends AttendanceProof {
  employeeId: number;
  /** From employee-service; attendance-service can't read the employees table. */
  joinDate: string;
}

export interface CheckOutPayload extends AttendanceProof {
  employeeId: number;
}

/** Photo paths are left out on purpose; photos are fetched through the protected endpoint. */
export interface AttendanceDto {
  id: number;
  employeeId: number;
  attendanceDate: string;
  checkInAt: string;
  checkOutAt: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  /** Start time in force at check-in (HH:mm); null on a non-working day. */
  workStartTime: string | null;
  checkInNote: string | null;
  checkOutNote: string | null;
  checkInLocation: GeoLocation | null;
  checkOutLocation: GeoLocation | null;
  /** Readable place for the location, e.g. "Coblong, Bandung, Jawa Barat"; null if unknown. */
  checkInPlace: string | null;
  checkOutPlace: string | null;
}

/**
 * How far a location can be trusted, from the device's own accuracy: "precise" to the
 * neighbourhood, "approximate" to the city, "unknown" when the device could only guess.
 */
export type LocationPrecision = 'precise' | 'approximate' | 'unknown';

export interface PlaceResult {
  place: string | null;
  precision: LocationPrecision;
}

export interface TodayAttendance {
  date: string;
  serverTime: string;
  isWorkingDay: boolean;
  workStartTime: string;
  dailyWorkMinutes: number;
  attendance: AttendanceDto | null;
}

export interface FindAttendanceHistoryPayload {
  employeeId: number;
  /** Defaults to the first day of `to`'s month. */
  from?: string;
  /** Defaults to today. */
  to?: string;
  page: number;
  limit: number;
}

export interface AttendanceHistory extends Paginated<AttendanceDto> {
  from: string;
  to: string;
}

export interface DailyAttendance {
  date: string;
  isWorkingDay: boolean;
  records: AttendanceDto[];
}

export interface FindPhotoPayload {
  attendanceId: number;
  kind: PhotoKind;
  /** Set for non-HR callers: the record must belong to this employee. */
  ownerEmployeeId?: number;
}

export interface PhotoResult {
  contentType: string;
  dataBase64: string;
}

export interface AttendanceSettingsDto {
  /** HH:mm */
  workStartTime: string;
  /** Measured from check-in to check-out. */
  dailyWorkMinutes: number;
  updatedAt: string;
  updatedByEmployeeId: number | null;
}

export interface UpdateAttendanceSettingsPayload {
  workStartTime: string;
  dailyWorkMinutes?: number;
  updatedByEmployeeId: number;
}
