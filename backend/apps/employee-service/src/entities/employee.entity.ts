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

/** HR master data. Credentials and role live in auth-service's users table. */
@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  // Company employee number (NIK), e.g. "EMP001".
  @Column({ name: 'employee_code', length: 20, unique: true })
  employeeCode: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'department_id' })
  departmentId: number;

  @ManyToOne(() => Department, (department) => department.employees, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ length: 100 })
  position: string;

  // Kept as a 'YYYY-MM-DD' string so no timezone conversion can shift the date.
  @Column({ name: 'join_date', type: 'date' })
  joinDate: string;

  // Employees are deactivated, never deleted, so attendance history stays intact.
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
