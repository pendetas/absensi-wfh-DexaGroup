import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Tabel `attendances`: satu baris = satu hari kerja WFH seorang karyawan
 * (check-in dan check-out disimpan di baris yang sama).
 *
 * `employeeId` adalah referensi logis ke `employees.id` (milik employee-service),
 * tanpa foreign key database, dengan alasan yang sama seperti `users.employee_id`.
 */
@Entity('attendances')
// Aturan bisnis di level database: karyawan hanya bisa punya SATU absensi per tanggal.
@Index('UQ_attendance_employee_date', ['employeeId', 'attendanceDate'], { unique: true })
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  // Tanggal kerja (WIB). Di-index karena HR sering memfilter monitoring per tanggal.
  @Index('IDX_attendance_date')
  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate: string;

  // Waktu diisi oleh SERVER saat check-in, bukan dikirim dari browser (anti manipulasi).
  @Column({ name: 'check_in_at', type: 'datetime' })
  checkInAt: Date;

  // Path file foto bukti WFH (file disimpan di folder uploads, bukan di database).
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
