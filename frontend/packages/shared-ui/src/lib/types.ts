/** Shapes of the gateway's JSON responses. Kept in step with backend/libs/common/src/contracts. */

export type Role = 'EMPLOYEE' | 'HR_ADMIN';

export interface AuthUser {
  id: number;
  employeeId: number;
  employeeCode: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface ClientSession {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface Department {
  id: number;
  name: string;
}

export interface Employee {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  departmentId: number;
  department: Department;
  position: string;
  joinDate: string;
  isActive: boolean;
}

export type AccountStatus = 'ACTIVE' | 'PASSWORD_CHANGE_REQUIRED' | 'LOCKED' | 'INACTIVE';

export interface AccountSummary {
  employeeId: number;
  role: Role;
  status: AccountStatus;
  lastLoginAt: string | null;
  lockedUntil: string | null;
}

export type EmployeeWithAccount = Employee & { account: AccountSummary | null };

export interface EmployeeInput {
  fullName: string;
  email: string;
  phone: string;
  departmentId: number;
  position: string;
  joinDate: string;
  role?: Role;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export type AttendanceStatus = 'ON_TIME' | 'LATE' | 'OFF_DAY';
export type DailyStatus = AttendanceStatus | 'NOT_CHECKED_IN';
export type PhotoKind = 'check-in' | 'check-out';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}

export interface Attendance {
  id: number;
  employeeId: number;
  attendanceDate: string;
  checkInAt: string;
  checkOutAt: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  workStartTime: string | null;
  checkInNote: string | null;
  checkOutNote: string | null;
  checkInLocation: GeoLocation | null;
  checkOutLocation: GeoLocation | null;
  /** Readable place, e.g. "Coblong, Bandung, Jawa Barat"; null when unknown. */
  checkInPlace: string | null;
  checkOutPlace: string | null;
}

export interface TodayAttendance {
  date: string;
  serverTime: string;
  isWorkingDay: boolean;
  workStartTime: string;
  /** Expected working time per day, in minutes. */
  dailyWorkMinutes: number;
  attendance: Attendance | null;
}

export interface AttendanceHistory extends Paginated<Attendance> {
  from: string;
  to: string;
}

export interface DailyRow {
  employee: Pick<
    Employee,
    'id' | 'employeeCode' | 'fullName' | 'department' | 'position' | 'isActive'
  >;
  attendance: Attendance | null;
  status: DailyStatus;
}

export interface DailyMonitoring extends Paginated<DailyRow> {
  date: string;
  isWorkingDay: boolean;
  summary: {
    onTime: number;
    late: number;
    offDay: number;
    notCheckedIn: number;
    checkedOut: number;
  };
  /** Every check-in of the date, whatever the list is filtered to. */
  arrivals: Arrival[];
}

export interface Arrival {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  checkInAt: string;
  status: AttendanceStatus;
  location: GeoLocation | null;
  place: string | null;
}

export interface AttendanceSettings {
  workStartTime: string;
  dailyWorkMinutes: number;
  updatedAt: string;
  updatedByEmployeeId: number | null;
}

export interface PlaceResult {
  place: string | null;
  precision: 'precise' | 'approximate' | 'unknown';
}
