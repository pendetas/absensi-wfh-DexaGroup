import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import {
  ATTENDANCE_PATTERNS,
  type CheckInPayload,
  type CheckOutPayload,
  type FindAttendanceHistoryPayload,
  type FindPhotoPayload,
  type GeoLocation,
  type UpdateAttendanceSettingsPayload,
} from '@app/common';
import { AttendanceService } from './attendance.service';
import { PlaceService } from './place.service';
import { SettingsService } from './settings.service';

@Controller()
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly settingsService: SettingsService,
    private readonly placeService: PlaceService,
    private readonly dataSource: DataSource,
  ) {}

  @MessagePattern(ATTENDANCE_PATTERNS.HEALTH)
  async health() {
    await this.dataSource.query('SELECT 1');
    return { service: 'attendance-service', status: 'ok', database: 'connected' };
  }

  @MessagePattern(ATTENDANCE_PATTERNS.TODAY)
  today(@Payload() payload: { employeeId: number }) {
    return this.attendanceService.today(payload.employeeId);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.CHECK_IN)
  checkIn(@Payload() payload: CheckInPayload) {
    return this.attendanceService.checkIn(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.CHECK_OUT)
  checkOut(@Payload() payload: CheckOutPayload) {
    return this.attendanceService.checkOut(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.FIND_HISTORY)
  findHistory(@Payload() payload: FindAttendanceHistoryPayload) {
    return this.attendanceService.findHistory(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.FIND_BY_DATE)
  findByDate(@Payload() payload: { date?: string }) {
    return this.attendanceService.findByDate(payload.date);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.FIND_PHOTO)
  findPhoto(@Payload() payload: FindPhotoPayload) {
    return this.attendanceService.findPhoto(payload);
  }

  /** For the camera screen, before check-in: where the device says it is, in words. */
  @MessagePattern(ATTENDANCE_PATTERNS.DESCRIBE_PLACE)
  describePlace(@Payload() payload: GeoLocation) {
    return this.placeService.describe(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.GET_SETTINGS)
  getSettings() {
    return this.settingsService.get();
  }

  @MessagePattern(ATTENDANCE_PATTERNS.UPDATE_SETTINGS)
  updateSettings(@Payload() payload: UpdateAttendanceSettingsPayload) {
    return this.settingsService.update(payload);
  }
}
