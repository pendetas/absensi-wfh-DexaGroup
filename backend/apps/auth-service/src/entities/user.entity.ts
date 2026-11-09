import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '@app/common';

/**
 * Tabel `users`: akun login (kredensial + role). Milik auth-service.
 *
 * `employeeId` adalah REFERENSI LOGIS ke `employees.id` (milik employee-service),
 * sengaja TANPA foreign key database: dalam arsitektur microservices setiap service
 * memiliki datanya sendiri dan tidak boleh terikat langsung ke tabel service lain.
 * Konsistensi dijaga di level aplikasi (gateway membuat employee lalu user-nya).
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // Satu karyawan = satu akun.
  @Column({ name: 'employee_id', unique: true })
  employeeId: number;

  @Column({ length: 100, unique: true })
  email: string;

  // Yang disimpan hanya HASH bcrypt, tidak pernah password asli.
  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.EMPLOYEE })
  role: Role;

  // Ikut nonaktif saat karyawan dinonaktifkan HR -> tidak bisa login lagi.
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
