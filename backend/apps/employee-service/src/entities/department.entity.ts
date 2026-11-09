import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

/**
 * Tabel `departments`: master data departemen.
 * Dipisah dari `employees` supaya nama departemen tidak diketik berulang (normalisasi).
 */
@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  // Relasi balik: satu departemen punya banyak karyawan (tidak membuat kolom baru).
  @OneToMany(() => Employee, (employee) => employee.department)
  employees: Employee[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
