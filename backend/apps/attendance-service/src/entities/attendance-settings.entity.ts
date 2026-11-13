import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export const SETTINGS_ROW_ID = 1;

/** Company-wide attendance rules. A single row (id 1), inserted by the migration. */
@Entity('attendance_settings')
export class AttendanceSettings {
  @PrimaryColumn({ type: 'tinyint', unsigned: true })
  id: number;

  @Column({ name: 'work_start_time', type: 'time' })
  workStartTime: string;

  // Measured from check-in to check-out; shown to employees as a daily target.
  @Column({ name: 'daily_work_minutes', type: 'smallint', unsigned: true, default: 480 })
  dailyWorkMinutes: number;

  // Logical reference to employees.id, kept for audit.
  @Column({ name: 'updated_by_employee_id', type: 'int', nullable: true })
  updatedByEmployeeId: number | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
