import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Department } from './department.entity';

/**
 * Tabel `employees`: data master karyawan yang dikelola HR.
 * Data login (password, role) TIDAK disimpan di sini, tetapi di tabel `users` milik auth-service.
 */
@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  // NIK / nomor induk karyawan, mis. "EMP001".
  @Column({ name: 'employee_code', length: 20, unique: true })
  employeeCode: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  // Kolom FK yang sebenarnya di database.
  @Column({ name: 'department_id' })
  departmentId: number;

  // Relasi ke departments: membuat FOREIGN KEY employees.department_id -> departments.id.
  // RESTRICT: departemen tidak bisa dihapus selama masih punya karyawan.
  @ManyToOne(() => Department, (department) => department.employees, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ length: 100 })
  position: string;

  // Tipe DATE dikembalikan sebagai string 'YYYY-MM-DD' (aman dari masalah timezone).
  @Column({ name: 'join_date', type: 'date' })
  joinDate: string;

  // Karyawan tidak dihapus permanen; cukup dinonaktifkan supaya riwayat absensi tetap utuh.
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
