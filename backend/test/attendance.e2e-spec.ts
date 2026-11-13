import type { AttendanceDto, TodayAttendance } from '@app/common';
import type { DailyMonitoring } from '../apps/api-gateway/src/attendance/attendance.service';
import { JPEG, TestSystem } from './support/test-system';

/**
 * The main journeys through the real gateway, services and MySQL, in story order:
 * each test builds on the state the previous ones left behind.
 */
describe('Attendance (e2e)', () => {
  let system: TestSystem;
  let hr: string;
  let budi: string;
  let siti: string;
  let budiAttendanceId: number;

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const checkIn = (token: string, photo: Buffer = JPEG, filename = 'photo.jpg') =>
    system.api.post('/api/attendance/check-in').set(bearer(token)).attach('photo', photo, filename);
  const checkOut = (token: string) =>
    system.api.post('/api/attendance/check-out').set(bearer(token)).attach('photo', JPEG, 'p.jpg');
  const monitoring = (query = '') =>
    system.api.get(`/api/attendance/monitoring${query}`).set(bearer(hr));

  beforeAll(async () => {
    system = await TestSystem.start();
    system.setJakartaTime('2026-11-09 08:30'); // Monday
    [hr, budi, siti] = await Promise.all([
      system.login('hr@dexa.test'),
      system.login('EMP002'),
      system.login('siti@dexa.test'),
    ]);
  }, 120_000);

  afterAll(async () => {
    await system?.stop();
  });

  it('requires a login', async () => {
    await system.api.get('/api/attendance/today').expect(401);
  });

  it('lets an employee check in with a photo; the server decides the time and status', async () => {
    const response = await checkIn(budi).field('note', 'Mulai kerja').expect(201);
    const attendance = response.body as AttendanceDto;
    budiAttendanceId = attendance.id;

    expect(attendance).toMatchObject({
      attendanceDate: '2026-11-09',
      checkInAt: '2026-11-09T01:30:00.000Z',
      status: 'ON_TIME',
      workStartTime: '09:00',
      checkInNote: 'Mulai kerja',
      checkOutAt: null,
    });

    const today = await system.api.get('/api/attendance/today').set(bearer(budi)).expect(200);
    expect((today.body as TodayAttendance).attendance?.id).toBe(attendance.id);
  });

  it('refuses a second check-in on the same day', async () => {
    const response = await checkIn(budi).expect(409);
    expect(response.body).toMatchObject({ message: 'Anda sudah check-in hari ini' });
  });

  it('rejects a file that is not an image, whatever it is named', async () => {
    await checkIn(siti, Buffer.from('not an image'), 'selfie.jpg').expect(415);
    await system.api.post('/api/attendance/check-in').set(bearer(siti)).expect(400);
  });

  it('enforces the 2 MB photo limit', async () => {
    const response = await checkIn(siti, Buffer.concat([JPEG, Buffer.alloc(2 * 1024 * 1024)]));
    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({ message: 'Ukuran foto maksimal 2 MB' });
  });

  it('flags a check-in after the work start time as late, with a photo close to the limit', async () => {
    system.setJakartaTime('2026-11-09 09:20');
    const largePhoto = Buffer.concat([JPEG, Buffer.alloc(1_900_000)]);

    const response = await checkIn(siti, largePhoto).expect(201);
    expect(response.body).toMatchObject({ status: 'LATE', lateMinutes: 20 });

    // The photo crosses two TCP hops as base64 each way and must come back intact.
    const { id } = response.body as AttendanceDto;
    const stored = await system.api
      .get(`/api/attendance/${id}/photos/check-in`)
      .set(bearer(siti))
      .expect(200);
    expect(Buffer.compare(stored.body as Buffer, largePhoto)).toBe(0);
  });

  it('shows a photo to its owner and to HR, but not to a colleague', async () => {
    const path = `/api/attendance/${budiAttendanceId}/photos/check-in`;

    const own = await system.api.get(path).set(bearer(budi)).expect(200);
    expect(own.headers['content-type']).toBe('image/jpeg');
    expect(own.headers['cache-control']).toBe('private, max-age=3600');
    expect(Buffer.compare(own.body as Buffer, JPEG)).toBe(0);

    await system.api.get(path).set(bearer(hr)).expect(200);
    await system.api.get(path).expect(401);
    const notHers = await system.api.get(path).set(bearer(siti)).expect(404);
    // A cached 404 would hide the check-out photo that appears later at the same URL.
    expect(notHers.headers['cache-control']).toBeUndefined();
  });

  it('lets the employee check out once, recording the location if it was shared', async () => {
    system.setJakartaTime('2026-11-09 17:05');

    // Half a coordinate pair is a client bug, not "no location".
    await checkOut(budi).field('latitude', '-6.2088').expect(400);

    const response = await checkOut(budi)
      .field('latitude', '-6.2088')
      .field('longitude', '106.8456')
      .field('accuracy', '24.6')
      .expect(200);
    expect(response.body).toMatchObject({
      checkOutAt: '2026-11-09T10:05:00.000Z',
      status: 'ON_TIME',
      checkInLocation: null,
      checkOutLocation: { latitude: -6.2088, longitude: 106.8456, accuracyMeters: 25 },
    });

    const again = await checkOut(budi).expect(409);
    expect(again.body).toMatchObject({ message: 'Anda sudah check-out hari ini' });
  });

  it('gives HR the whole day at a glance, including who has not checked in', async () => {
    const response = await monitoring().expect(200);
    const day = response.body as DailyMonitoring;

    expect(day).toMatchObject({
      date: '2026-11-09',
      isWorkingDay: true,
      summary: { onTime: 1, late: 1, offDay: 0, notCheckedIn: 3, checkedOut: 1 },
      meta: { total: 5 },
    });
    const statusByCode = Object.fromEntries(
      day.data.map((row) => [row.employee.employeeCode, row.status]),
    );
    expect(statusByCode).toEqual({
      EMP001: 'NOT_CHECKED_IN',
      EMP002: 'ON_TIME',
      EMP003: 'LATE',
      EMP004: 'NOT_CHECKED_IN',
      EMP005: 'NOT_CHECKED_IN',
    });

    const late = await monitoring('?status=LATE').expect(200);
    expect((late.body as DailyMonitoring).data.map((row) => row.employee.fullName)).toEqual([
      'Siti Rahmawati',
    ]);
    // The arrival chart keeps showing everyone who checked in, whatever the list is filtered to.
    expect(
      (late.body as DailyMonitoring).arrivals.map((arrival) => [
        arrival.employeeCode,
        arrival.status,
      ]),
    ).toEqual([
      ['EMP002', 'ON_TIME'],
      ['EMP003', 'LATE'],
    ]);
  });

  it('keeps monitoring and settings changes for HR only', async () => {
    await system.api.get('/api/attendance/monitoring').set(bearer(budi)).expect(403);
    await system.api.get('/api/attendance/employees/3').set(bearer(budi)).expect(403);
    await system.api
      .put('/api/attendance/settings')
      .set(bearer(budi))
      .send({ workStartTime: '11:00' })
      .expect(403);
  });

  it('applies a new work start time from the next check-in without rewriting history', async () => {
    await system.api
      .put('/api/attendance/settings')
      .set(bearer(hr))
      .send({ workStartTime: '10:00' })
      .expect(200);

    system.setJakartaTime('2026-11-10 09:30');
    const tuesday = await checkIn(budi).expect(201);
    expect(tuesday.body).toMatchObject({
      attendanceDate: '2026-11-10',
      status: 'ON_TIME',
      workStartTime: '10:00',
    });

    const monday = await monitoring('?date=2026-11-09&status=LATE').expect(200);
    expect((monday.body as DailyMonitoring).data[0].attendance).toMatchObject({
      status: 'LATE',
      workStartTime: '09:00',
    });
  });

  it('leaves a missed check-out open instead of closing it the next day', async () => {
    // Siti never checked out on Monday; it is now Tuesday and she has not checked in yet.
    const response = await checkOut(siti).expect(409);
    expect(response.body).toMatchObject({ message: 'Anda belum check-in hari ini' });

    const history = await system.api
      .get('/api/attendance/employees/3?from=2026-11-01&to=2026-11-30')
      .set(bearer(hr))
      .expect(200);
    expect(history.body).toMatchObject({
      employee: { employeeCode: 'EMP003' },
      data: [{ attendanceDate: '2026-11-09', checkOutAt: null }],
    });
  });

  it('applies no late rule on a weekend and lists nobody as missing', async () => {
    system.setJakartaTime('2026-11-14 13:00'); // Saturday
    const response = await checkIn(siti).expect(201);
    expect(response.body).toMatchObject({ status: 'OFF_DAY', lateMinutes: 0, workStartTime: null });
    await checkOut(siti).expect(200);

    const saturday = await monitoring().expect(200);
    expect(saturday.body).toMatchObject({
      isWorkingDay: false,
      summary: { offDay: 1, notCheckedIn: 0 },
      meta: { total: 1 },
    });
  });

  it('takes a new hire from temporary password to first check-in, not before the join date', async () => {
    system.setJakartaTime('2026-11-16 08:45'); // Monday
    const created = await system.api
      .post('/api/employees')
      .set(bearer(hr))
      .send({
        fullName: 'Agus Saputra',
        email: 'agus@dexa.test',
        phone: '0812-3456-7890',
        departmentId: 2,
        position: 'Backend Engineer',
        joinDate: '2026-11-17',
      })
      .expect(201);
    const { employee, temporaryPassword } = created.body as {
      employee: { employeeCode: string };
      temporaryPassword: string;
    };
    expect(employee.employeeCode).toBe('EMP006');

    // The temporary password only opens the change-password screen.
    const temporaryToken = await system.login('EMP006', temporaryPassword);
    const blocked = await checkIn(temporaryToken).expect(403);
    expect(blocked.body).toMatchObject({ code: 'PASSWORD_CHANGE_REQUIRED' });

    const changed = await system.api
      .post('/api/auth/change-password')
      .set(bearer(temporaryToken))
      .send({ currentPassword: temporaryPassword, newPassword: 'PasswordBaru1' })
      .expect(200);
    const agus = (changed.body as { accessToken: string }).accessToken;

    const tooEarly = await checkIn(agus).expect(403);
    expect((tooEarly.body as { message: string }).message).toContain('17 November 2026');

    system.setJakartaTime('2026-11-17 08:45');
    await checkIn(agus).expect(201);
  });
});
