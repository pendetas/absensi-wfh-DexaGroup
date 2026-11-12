import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ATTENDANCE_PATTERNS,
  ATTENDANCE_SERVICE,
  type AttendanceDto,
  type AttendanceHistory,
  type AttendanceSettingsDto,
  AttendanceStatus,
  type CheckInPayload,
  type CheckOutPayload,
  type DailyAttendance,
  type DailyStatus,
  EMPLOYEE_PATTERNS,
  EMPLOYEE_SERVICE,
  type EmployeeDto,
  EmployeeStatusFilter,
  type FindEmployeesPayload,
  type JwtPayload,
  NOT_CHECKED_IN,
  type Paginated,
  type PhotoKind,
  type PhotoResult,
  Role,
  type TodayAttendance,
} from '@app/common';
import { callService } from '../common/service-client';
import { AttendanceProofDto, HistoryQueryDto, MonitoringQueryDto } from './dto/attendance.dto';

type RosterEmployee = Pick<
  EmployeeDto,
  'id' | 'employeeCode' | 'fullName' | 'department' | 'position' | 'isActive'
>;

export interface DailyRow {
  employee: RosterEmployee;
  attendance: AttendanceDto | null;
  status: DailyStatus;
}

export interface DailyMonitoring extends Paginated<DailyRow> {
  date: string;
  isWorkingDay: boolean;
  /** Whole company for the date, regardless of the search and filters applied to `data`. */
  summary: {
    onTime: number;
    late: number;
    offDay: number;
    notCheckedIn: number;
    checkedOut: number;
  };
  /** Every check-in of the date, unpaginated and unfiltered, for HR's arrival chart. */
  arrivals: Arrival[];
}

export interface Arrival {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  checkInAt: string;
  status: AttendanceStatus;
}

type RosterFilter = Pick<
  FindEmployeesPayload,
  'status' | 'joinedOnOrBefore' | 'alwaysIncludeIds' | 'ids' | 'excludeIds'
>;

/**
 * Attendance rows live in attendance-service and names in employee-service, so the gateway
 * joins them: one call for the day's records, then calls for the matching page of employees,
 * the missing count, and the names of everyone who checked in.
 */
@Injectable()
export class AttendanceService {
  constructor(
    @Inject(ATTENDANCE_SERVICE) private readonly attendanceClient: ClientProxy,
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
  ) {}

  today(user: JwtPayload): Promise<TodayAttendance> {
    return callService(this.attendanceClient, ATTENDANCE_PATTERNS.TODAY, {
      employeeId: user.employeeId,
    });
  }

  async checkIn(user: JwtPayload, photo: Express.Multer.File, dto: AttendanceProofDto) {
    const employee = await this.findEmployee(user.employeeId);
    // A deactivated employee's access token stays valid for a few more minutes.
    if (!employee.isActive) throw new ForbiddenException('Akun Anda sudah tidak aktif');

    const payload: CheckInPayload = {
      employeeId: employee.id,
      joinDate: employee.joinDate,
      ...this.toProof(photo, dto),
    };
    return callService<AttendanceDto>(this.attendanceClient, ATTENDANCE_PATTERNS.CHECK_IN, payload);
  }

  checkOut(user: JwtPayload, photo: Express.Multer.File, dto: AttendanceProofDto) {
    const payload: CheckOutPayload = {
      employeeId: user.employeeId,
      ...this.toProof(photo, dto),
    };
    return callService<AttendanceDto>(
      this.attendanceClient,
      ATTENDANCE_PATTERNS.CHECK_OUT,
      payload,
    );
  }

  private toProof(photo: Express.Multer.File, dto: AttendanceProofDto) {
    const hasLocation = dto.latitude !== undefined && dto.longitude !== undefined;
    return {
      photoBase64: photo.buffer.toString('base64'),
      note: dto.note,
      location: hasLocation
        ? {
            latitude: dto.latitude!,
            longitude: dto.longitude!,
            accuracyMeters: dto.accuracy === undefined ? null : Math.round(dto.accuracy),
          }
        : undefined,
    };
  }

  history(employeeId: number, query: HistoryQueryDto): Promise<AttendanceHistory> {
    return callService(this.attendanceClient, ATTENDANCE_PATTERNS.FIND_HISTORY, {
      employeeId,
      ...query,
    });
  }

  async employeeHistory(employeeId: number, query: HistoryQueryDto) {
    const employee = await this.findEmployee(employeeId);
    return { employee, ...(await this.history(employeeId, query)) };
  }

  /** HR sees every photo; anyone else only their own. */
  photo(attendanceId: number, kind: PhotoKind, user: JwtPayload): Promise<PhotoResult> {
    return callService(this.attendanceClient, ATTENDANCE_PATTERNS.FIND_PHOTO, {
      attendanceId,
      kind,
      ownerEmployeeId: user.role === Role.HR_ADMIN ? undefined : user.employeeId,
    });
  }

  settings(): Promise<AttendanceSettingsDto> {
    return callService(this.attendanceClient, ATTENDANCE_PATTERNS.GET_SETTINGS);
  }

  updateSettings(workStartTime: string, actor: JwtPayload): Promise<AttendanceSettingsDto> {
    return callService(this.attendanceClient, ATTENDANCE_PATTERNS.UPDATE_SETTINGS, {
      workStartTime,
      updatedByEmployeeId: actor.employeeId,
    });
  }

  async monitoring({
    date,
    status,
    ...employeeQuery
  }: MonitoringQueryDto): Promise<DailyMonitoring> {
    const daily = await callService<DailyAttendance>(
      this.attendanceClient,
      ATTENDANCE_PATTERNS.FIND_BY_DATE,
      { date },
    );
    const byEmployeeId = new Map(daily.records.map((record) => [record.employeeId, record]));
    const presentIds = [...byEmployeeId.keys()];

    const [employees, notCheckedIn, present] = await Promise.all([
      this.findEmployees({ ...this.rosterFilter(daily, presentIds, status), ...employeeQuery }),
      daily.isWorkingDay
        ? this.findEmployees({
            ...this.expectedOn(daily.date),
            excludeIds: presentIds,
            page: 1,
            limit: 1,
          }).then((page) => page.meta.total)
        : 0,
      // One page holding everyone who checked in, whatever HR is searching or filtering.
      this.findEmployees({
        status: EmployeeStatusFilter.ALL,
        ids: presentIds,
        page: 1,
        limit: Math.max(presentIds.length, 1),
      }),
    ]);
    const namesById = new Map(present.data.map((employee) => [employee.id, employee]));

    const countByStatus = (wanted: AttendanceStatus) =>
      daily.records.filter((record) => record.status === wanted).length;

    return {
      date: daily.date,
      isWorkingDay: daily.isWorkingDay,
      summary: {
        onTime: countByStatus(AttendanceStatus.ON_TIME),
        late: countByStatus(AttendanceStatus.LATE),
        offDay: countByStatus(AttendanceStatus.OFF_DAY),
        notCheckedIn,
        checkedOut: daily.records.filter((record) => record.checkOutAt).length,
      },
      arrivals: daily.records.flatMap((record) => {
        const employee = namesById.get(record.employeeId);
        return employee
          ? [
              {
                employeeId: record.employeeId,
                employeeCode: employee.employeeCode,
                fullName: employee.fullName,
                checkInAt: record.checkInAt,
                status: record.status,
              },
            ]
          : [];
      }),
      data: employees.data.map((employee) => {
        const attendance = byEmployeeId.get(employee.id) ?? null;
        return {
          employee: {
            id: employee.id,
            employeeCode: employee.employeeCode,
            fullName: employee.fullName,
            department: employee.department,
            position: employee.position,
            isActive: employee.isActive,
          },
          attendance,
          status: attendance?.status ?? NOT_CHECKED_IN,
        };
      }),
      meta: employees.meta,
    };
  }

  /** Which employees belong in the list for this date and status filter. */
  private rosterFilter(
    daily: DailyAttendance,
    presentIds: number[],
    status?: DailyStatus,
  ): RosterFilter {
    const only = (ids: number[]): RosterFilter => ({ status: EmployeeStatusFilter.ALL, ids });

    if (status === NOT_CHECKED_IN) {
      return daily.isWorkingDay
        ? { ...this.expectedOn(daily.date), excludeIds: presentIds }
        : only([]);
    }
    if (status) {
      return only(
        daily.records.filter((record) => record.status === status).map((r) => r.employeeId),
      );
    }
    // Nobody is expected on a non-working day, so only those who checked in are listed.
    return daily.isWorkingDay
      ? { ...this.expectedOn(daily.date), alwaysIncludeIds: presentIds }
      : only(presentIds);
  }

  /** Employees who should have attended on the date: active and already joined. */
  private expectedOn(date: string): RosterFilter {
    return { status: EmployeeStatusFilter.ACTIVE, joinedOnOrBefore: date };
  }

  private findEmployees(payload: FindEmployeesPayload): Promise<Paginated<EmployeeDto>> {
    return callService(this.employeeClient, EMPLOYEE_PATTERNS.FIND_ALL, payload);
  }

  private findEmployee(id: number): Promise<EmployeeDto> {
    return callService(this.employeeClient, EMPLOYEE_PATTERNS.FIND_BY_ID, { id });
  }
}
