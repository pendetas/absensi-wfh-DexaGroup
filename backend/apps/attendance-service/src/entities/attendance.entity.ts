import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceStatus } from '@app/common';

/**
 * One row per employee per WFH day; check-in and check-out share the row.
 * employeeId points to employees.id without a FK, same as users.employee_id.
 */
@Entity('attendances')
@Index('UQ_attendance_employee_date', ['employeeId', 'attendanceDate'], { unique: true })
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  // WIB work date. Indexed for the HR monitoring date filter.
  @Index('IDX_attendance_date')
  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate: string;

  // Set from the server clock; never accepted from the client.
  @Column({ name: 'check_in_at', type: 'datetime' })
  checkInAt: Date;

  // Path under UPLOAD_DIR; the image itself is not stored in MySQL.
  @Column({ name: 'check_in_photo', length: 255 })
  checkInPhoto: string;

  @Column({ name: 'check_in_note', type: 'varchar', length: 255, nullable: true })
  checkInNote: string | null;

  // Sent by the device only if the employee allows it. Stored as evidence, not validated.
  @Column({ name: 'check_in_latitude', type: 'double', nullable: true })
  checkInLatitude: number | null;

  @Column({ name: 'check_in_longitude', type: 'double', nullable: true })
  checkInLongitude: number | null;

  @Column({ name: 'check_in_accuracy_m', type: 'int', unsigned: true, nullable: true })
  checkInAccuracyM: number | null;

  // Looked up once at check-in, so HR reads a place instead of coordinates.
  @Column({ name: 'check_in_place', type: 'varchar', length: 160, nullable: true })
  checkInPlace: string | null;

  // Decided once at check-in; later changes to the work start time don't rewrite history.
  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  @Column({ name: 'late_minutes', type: 'smallint', unsigned: true, default: 0 })
  lateMinutes: number;

  // The start time the status was judged against; null on a non-working day.
  @Column({ name: 'work_start_time', type: 'time', nullable: true })
  workStartTime: string | null;

  @Column({ name: 'check_out_at', type: 'datetime', nullable: true })
  checkOutAt: Date | null;

  @Column({ name: 'check_out_photo', type: 'varchar', length: 255, nullable: true })
  checkOutPhoto: string | null;

  @Column({ name: 'check_out_note', type: 'varchar', length: 255, nullable: true })
  checkOutNote: string | null;

  @Column({ name: 'check_out_latitude', type: 'double', nullable: true })
  checkOutLatitude: number | null;

  @Column({ name: 'check_out_longitude', type: 'double', nullable: true })
  checkOutLongitude: number | null;

  @Column({ name: 'check_out_accuracy_m', type: 'int', unsigned: true, nullable: true })
  checkOutAccuracyM: number | null;

  @Column({ name: 'check_out_place', type: 'varchar', length: 160, nullable: true })
  checkOutPlace: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
