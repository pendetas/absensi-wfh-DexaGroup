import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, QueryFailedError, Repository } from 'typeorm';
import {
  AttendanceDto,
  AttendanceHistory,
  CheckInPayload,
  CheckOutPayload,
  DailyAttendance,
  dayOfWeekOf,
  FindAttendanceHistoryPayload,
  FindPhotoPayload,
  GeoLocation,
  LocalDateTime,
  PhotoKind,
  PhotoResult,
  rpcError,
  TodayAttendance,
  toLocalDateTime,
} from '@app/common';
import { evaluateCheckIn, isWorkingDay } from './attendance.rules';
import { Clock } from './clock';
import { Attendance } from './entities/attendance.entity';
import { PhotoStorageService } from './photo-storage.service';
import { SettingsService } from './settings.service';

const ALREADY_CHECKED_IN = 'Anda sudah check-in hari ini';
const ALREADY_CHECKED_OUT = 'Anda sudah check-out hari ini';

const longDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' });

const toLocation = (
  latitude: number | null,
  longitude: number | null,
  accuracyMeters: number | null,
): GeoLocation | null =>
  latitude == null || longitude == null ? null : { latitude, longitude, accuracyMeters };

const isDuplicateEntry = (error: unknown) =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly attendanceRepository: Repository<Attendance>,
    private readonly settingsService: SettingsService,
    private readonly photoStorage: PhotoStorageService,
    private readonly clock: Clock,
    private readonly config: ConfigService,
  ) {}

  async today(employeeId: number): Promise<TodayAttendance> {
    const now = this.clock.now();
    const local = this.toLocal(now);
    const [settings, attendance] = await Promise.all([
      this.settingsService.get(),
      this.attendanceRepository.findOneBy({ employeeId, attendanceDate: local.date }),
    ]);
    return {
      date: local.date,
      serverTime: now.toISOString(),
      isWorkingDay: isWorkingDay(local.dayOfWeek),
      workStartTime: settings.workStartTime,
      attendance: attendance ? this.toDto(attendance) : null,
    };
  }

  async checkIn({
    employeeId,
    joinDate,
    photoBase64,
    note,
    location,
  }: CheckInPayload): Promise<AttendanceDto> {
    const now = this.clock.now();
    const local = this.toLocal(now);

    if (local.date < joinDate) {
      const firstDay = longDate.format(new Date(`${joinDate}T00:00:00Z`));
      throw rpcError(
        HttpStatus.FORBIDDEN,
        `Absensi baru dapat dilakukan mulai tanggal bergabung Anda, ${firstDay}`,
      );
    }
    if (await this.attendanceRepository.existsBy({ employeeId, attendanceDate: local.date })) {
      throw rpcError(HttpStatus.CONFLICT, ALREADY_CHECKED_IN);
    }

    const { workStartTime } = await this.settingsService.get();
    const evaluation = evaluateCheckIn(local, workStartTime);
    const photoPath = await this.photoStorage.save(photoBase64, local.date);

    try {
      const attendance = await this.attendanceRepository.save(
        this.attendanceRepository.create({
          employeeId,
          attendanceDate: local.date,
          checkInAt: now,
          checkInPhoto: photoPath,
          checkInNote: note?.trim() || null,
          checkInLatitude: location?.latitude ?? null,
          checkInLongitude: location?.longitude ?? null,
          checkInAccuracyM: location?.accuracyMeters ?? null,
          ...evaluation,
        }),
      );
      return this.toDto(attendance);
    } catch (error) {
      await this.photoStorage.remove(photoPath);
      // Two check-ins raced past the existsBy check; the unique index let only one through.
      if (isDuplicateEntry(error)) throw rpcError(HttpStatus.CONFLICT, ALREADY_CHECKED_IN);
      throw error;
    }
  }

  /** Only today's record can be closed; a missed check-out stays open. */
  async checkOut({
    employeeId,
    photoBase64,
    note,
    location,
  }: CheckOutPayload): Promise<AttendanceDto> {
    const now = this.clock.now();
    const local = this.toLocal(now);

    const attendance = await this.attendanceRepository.findOneBy({
      employeeId,
      attendanceDate: local.date,
    });
    if (!attendance) throw rpcError(HttpStatus.CONFLICT, 'Anda belum check-in hari ini');
    if (attendance.checkOutAt) throw rpcError(HttpStatus.CONFLICT, ALREADY_CHECKED_OUT);

    const photoPath = await this.photoStorage.save(photoBase64, local.date);
    // The IS NULL condition makes a double submit update zero rows instead of overwriting.
    const result = await this.attendanceRepository.update(
      { id: attendance.id, checkOutAt: IsNull() },
      {
        checkOutAt: now,
        checkOutPhoto: photoPath,
        checkOutNote: note?.trim() || null,
        checkOutLatitude: location?.latitude ?? null,
        checkOutLongitude: location?.longitude ?? null,
        checkOutAccuracyM: location?.accuracyMeters ?? null,
      },
    );
    if (!result.affected) {
      await this.photoStorage.remove(photoPath);
      throw rpcError(HttpStatus.CONFLICT, ALREADY_CHECKED_OUT);
    }
    return this.toDto(await this.attendanceRepository.findOneByOrFail({ id: attendance.id }));
  }

  async findHistory({
    employeeId,
    page,
    limit,
    ...range
  }: FindAttendanceHistoryPayload): Promise<AttendanceHistory> {
    const to = range.to ?? this.toLocal(this.clock.now()).date;
    const from = range.from ?? `${to.slice(0, 7)}-01`;
    if (from > to) {
      throw rpcError(HttpStatus.BAD_REQUEST, 'Tanggal awal tidak boleh setelah tanggal akhir');
    }

    const [records, total] = await this.attendanceRepository.findAndCount({
      where: { employeeId, attendanceDate: Between(from, to) },
      order: { attendanceDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      from,
      to,
      data: records.map((record) => this.toDto(record)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Every record of one day, for the gateway to join with the employee list. */
  async findByDate(requestedDate?: string): Promise<DailyAttendance> {
    const today = this.toLocal(this.clock.now()).date;
    const date = requestedDate ?? today;
    if (date > today) {
      throw rpcError(HttpStatus.BAD_REQUEST, 'Tanggal tidak boleh di masa depan');
    }
    const records = await this.attendanceRepository.find({
      where: { attendanceDate: date },
      order: { checkInAt: 'ASC' },
    });
    return {
      date,
      isWorkingDay: isWorkingDay(dayOfWeekOf(date)),
      records: records.map((record) => this.toDto(record)),
    };
  }

  async findPhoto({ attendanceId, kind, ownerEmployeeId }: FindPhotoPayload): Promise<PhotoResult> {
    const attendance = await this.attendanceRepository.findOneBy({
      id: attendanceId,
      ...(ownerEmployeeId ? { employeeId: ownerEmployeeId } : {}),
    });
    const path = kind === PhotoKind.CHECK_IN ? attendance?.checkInPhoto : attendance?.checkOutPhoto;
    // Same 404 for "not yours" and "does not exist", so ids can't be probed.
    if (!path) throw rpcError(HttpStatus.NOT_FOUND, 'Foto absensi tidak ditemukan');

    const photo = await this.photoStorage.read(path);
    return { contentType: photo.contentType, dataBase64: photo.data.toString('base64') };
  }

  private toLocal(instant: Date): LocalDateTime {
    return toLocalDateTime(instant, this.config.get<string>('APP_TIMEZONE', '+07:00'));
  }

  private toDto(attendance: Attendance): AttendanceDto {
    return {
      id: attendance.id,
      employeeId: attendance.employeeId,
      attendanceDate: attendance.attendanceDate,
      checkInAt: attendance.checkInAt.toISOString(),
      checkOutAt: attendance.checkOutAt?.toISOString() ?? null,
      status: attendance.status,
      lateMinutes: attendance.lateMinutes,
      workStartTime: attendance.workStartTime?.slice(0, 5) ?? null,
      checkInNote: attendance.checkInNote,
      checkOutNote: attendance.checkOutNote,
      checkInLocation: toLocation(
        attendance.checkInLatitude,
        attendance.checkInLongitude,
        attendance.checkInAccuracyM,
      ),
      checkOutLocation: toLocation(
        attendance.checkOutLatitude,
        attendance.checkOutLongitude,
        attendance.checkOutAccuracyM,
      ),
    };
  }
}
