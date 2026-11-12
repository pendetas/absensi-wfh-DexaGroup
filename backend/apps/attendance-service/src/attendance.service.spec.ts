import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { QueryFailedError, Repository } from 'typeorm';
import { AttendanceStatus, CheckInPayload, PhotoKind, RpcErrorPayload } from '@app/common';
import { AttendanceService } from './attendance.service';
import { Attendance } from './entities/attendance.entity';
import { PhotoStorageService } from './photo-storage.service';
import { SettingsService } from './settings.service';

const PHOTO = 'base64-photo';
const STORED_PATH = 'attendance/2026/11/photo.jpg';

/** Rejection as { statusCode, message }, the shape the gateway receives over TCP. */
async function rpcErrorOf(promise: Promise<unknown>): Promise<RpcErrorPayload> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RpcException) return error.getError() as RpcErrorPayload;
    throw error;
  }
  throw new Error('Expected the call to be rejected');
}

describe('AttendanceService', () => {
  let now: Date;
  let repository: jest.Mocked<
    Pick<
      Repository<Attendance>,
      'existsBy' | 'findOneBy' | 'findOneByOrFail' | 'find' | 'save' | 'update'
    >
  > & { create: (data: Partial<Attendance>) => Attendance };
  let photoStorage: jest.Mocked<Pick<PhotoStorageService, 'save' | 'remove' | 'read'>>;
  let service: AttendanceService;

  const record = (overrides: Partial<Attendance> = {}): Attendance =>
    ({
      id: 7,
      employeeId: 2,
      attendanceDate: '2026-11-09',
      checkInAt: new Date('2026-11-09T01:30:00Z'),
      checkInPhoto: STORED_PATH,
      checkInNote: null,
      status: AttendanceStatus.ON_TIME,
      lateMinutes: 0,
      workStartTime: '09:00:00',
      checkOutAt: null,
      checkOutPhoto: null,
      checkOutNote: null,
      checkInLatitude: null,
      checkInLongitude: null,
      checkInAccuracyM: null,
      checkOutLatitude: null,
      checkOutLongitude: null,
      checkOutAccuracyM: null,
      ...overrides,
    }) as Attendance;

  const checkIn = (overrides: Partial<CheckInPayload> = {}) =>
    service.checkIn({ employeeId: 2, joinDate: '2022-01-10', photoBase64: PHOTO, ...overrides });

  beforeEach(() => {
    // Monday 9 Nov 2026, 08:30 in Jakarta.
    now = new Date('2026-11-09T01:30:00Z');
    repository = {
      existsBy: jest.fn().mockResolvedValue(false),
      findOneBy: jest.fn().mockResolvedValue(null),
      findOneByOrFail: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest
        .fn()
        .mockImplementation((data: Partial<Attendance>) => Promise.resolve({ id: 7, ...data })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      create: (data) => data as Attendance,
    };
    photoStorage = {
      save: jest.fn().mockResolvedValue(STORED_PATH),
      remove: jest.fn().mockResolvedValue(undefined),
      read: jest.fn().mockResolvedValue({ contentType: 'image/jpeg', data: Buffer.from('img') }),
    };
    service = new AttendanceService(
      repository as unknown as Repository<Attendance>,
      { get: () => Promise.resolve({ workStartTime: '09:00' }) } as unknown as SettingsService,
      photoStorage as unknown as PhotoStorageService,
      { now: () => now },
      { get: (_key: string, fallback: string) => fallback } as unknown as ConfigService,
    );
  });

  describe('checkIn', () => {
    it('records an on-time check-in with the server time and the start time in force', async () => {
      const result = await checkIn({ note: '  Mulai kerja  ' });

      expect(result).toMatchObject({
        employeeId: 2,
        attendanceDate: '2026-11-09',
        checkInAt: '2026-11-09T01:30:00.000Z',
        status: AttendanceStatus.ON_TIME,
        lateMinutes: 0,
        workStartTime: '09:00',
        checkInNote: 'Mulai kerja',
      });
      expect(result).not.toHaveProperty('checkInPhoto');
    });

    it('flags a check-in after the start time as late', async () => {
      now = new Date('2026-11-09T02:25:00Z');
      expect(await checkIn()).toMatchObject({ status: AttendanceStatus.LATE, lateMinutes: 25 });
    });

    it('keeps the location when the employee shared it, and null when not', async () => {
      const location = { latitude: -6.2088, longitude: 106.8456, accuracyMeters: 25 };

      expect((await checkIn({ location })).checkInLocation).toEqual(location);
      expect((await checkIn()).checkInLocation).toBeNull();
    });

    it('uses the Jakarta date, not the UTC date, as the work date', async () => {
      // 00:30 on Tuesday in Jakarta is still Monday in UTC.
      now = new Date('2026-11-09T17:30:00Z');
      expect((await checkIn()).attendanceDate).toBe('2026-11-10');
    });

    it('applies no late rule on a weekend', async () => {
      now = new Date('2026-11-08T07:00:00Z');
      expect(await checkIn()).toMatchObject({
        status: AttendanceStatus.OFF_DAY,
        lateMinutes: 0,
        workStartTime: null,
      });
    });

    it('refuses a check-in before the join date and stores no photo', async () => {
      const error = await rpcErrorOf(checkIn({ joinDate: '2026-12-01' }));

      expect(error.statusCode).toBe(HttpStatus.FORBIDDEN);
      expect(error.message).toContain('1 Desember 2026');
      expect(photoStorage.save).not.toHaveBeenCalled();
    });

    it('allows a check-in on the join date itself', async () => {
      await expect(checkIn({ joinDate: '2026-11-09' })).resolves.toBeDefined();
    });

    it('refuses a second check-in on the same day and stores no photo', async () => {
      repository.existsBy.mockResolvedValue(true);

      expect(await rpcErrorOf(checkIn())).toEqual({
        statusCode: HttpStatus.CONFLICT,
        message: 'Anda sudah check-in hari ini',
      });
      expect(photoStorage.save).not.toHaveBeenCalled();
    });

    it('removes the photo when a concurrent check-in wins the unique index', async () => {
      const duplicate = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
      repository.save.mockRejectedValue(new QueryFailedError('INSERT', [], duplicate));

      expect((await rpcErrorOf(checkIn())).statusCode).toBe(HttpStatus.CONFLICT);
      expect(photoStorage.remove).toHaveBeenCalledWith(STORED_PATH);
    });

    it('removes the photo and rethrows when the insert fails for another reason', async () => {
      repository.save.mockRejectedValue(new Error('connection lost'));

      await expect(checkIn()).rejects.toThrow('connection lost');
      expect(photoStorage.remove).toHaveBeenCalledWith(STORED_PATH);
    });
  });

  describe('checkOut', () => {
    const checkOut = () => service.checkOut({ employeeId: 2, photoBase64: PHOTO, note: 'Selesai' });

    it("closes today's record", async () => {
      now = new Date('2026-11-09T10:05:00Z');
      repository.findOneBy.mockResolvedValue(record());
      repository.findOneByOrFail.mockResolvedValue(
        record({ checkOutAt: now, checkOutNote: 'Selesai' }),
      );

      const result = await checkOut();

      expect(repository.findOneBy).toHaveBeenCalledWith({
        employeeId: 2,
        attendanceDate: '2026-11-09',
      });
      expect(result).toMatchObject({
        checkOutAt: '2026-11-09T10:05:00.000Z',
        checkOutNote: 'Selesai',
        status: AttendanceStatus.ON_TIME,
      });
    });

    it('refuses when there is no check-in today, e.g. yesterday was left open', async () => {
      expect(await rpcErrorOf(checkOut())).toEqual({
        statusCode: HttpStatus.CONFLICT,
        message: 'Anda belum check-in hari ini',
      });
      expect(photoStorage.save).not.toHaveBeenCalled();
    });

    it('refuses a second check-out', async () => {
      repository.findOneBy.mockResolvedValue(record({ checkOutAt: new Date() }));

      expect((await rpcErrorOf(checkOut())).message).toBe('Anda sudah check-out hari ini');
      expect(photoStorage.save).not.toHaveBeenCalled();
    });

    it('removes the photo when a concurrent check-out got there first', async () => {
      repository.findOneBy.mockResolvedValue(record());
      repository.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

      expect((await rpcErrorOf(checkOut())).statusCode).toBe(HttpStatus.CONFLICT);
      expect(photoStorage.remove).toHaveBeenCalledWith(STORED_PATH);
    });
  });

  describe('findByDate', () => {
    it('defaults to today and reports whether it is a working day', async () => {
      expect(await service.findByDate()).toEqual({
        date: '2026-11-09',
        isWorkingDay: true,
        records: [],
      });
      expect((await service.findByDate('2026-11-08')).isWorkingDay).toBe(false);
    });

    it('rejects a date in the future', async () => {
      expect((await rpcErrorOf(service.findByDate('2026-11-10'))).statusCode).toBe(
        HttpStatus.BAD_REQUEST,
      );
    });
  });

  describe('findPhoto', () => {
    it('looks the record up by owner for non-HR callers and hides a miss as 404', async () => {
      const error = await rpcErrorOf(
        service.findPhoto({ attendanceId: 7, kind: PhotoKind.CHECK_IN, ownerEmployeeId: 3 }),
      );

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 7, employeeId: 3 });
      expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(photoStorage.read).not.toHaveBeenCalled();
    });

    it('returns 404 for the check-out photo of a record that is still open', async () => {
      repository.findOneBy.mockResolvedValue(record());

      const error = await rpcErrorOf(
        service.findPhoto({ attendanceId: 7, kind: PhotoKind.CHECK_OUT }),
      );
      expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('returns the stored photo as base64 with its content type', async () => {
      repository.findOneBy.mockResolvedValue(record());

      expect(await service.findPhoto({ attendanceId: 7, kind: PhotoKind.CHECK_IN })).toEqual({
        contentType: 'image/jpeg',
        dataBase64: Buffer.from('img').toString('base64'),
      });
      expect(photoStorage.read).toHaveBeenCalledWith(STORED_PATH);
    });
  });
});
