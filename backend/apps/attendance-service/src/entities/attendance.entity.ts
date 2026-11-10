import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column({ name: 'check_out_at', type: 'datetime', nullable: true })
  checkOutAt: Date | null;

  @Column({ name: 'check_out_photo', type: 'varchar', length: 255, nullable: true })
  checkOutPhoto: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
