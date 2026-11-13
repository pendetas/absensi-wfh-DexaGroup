/**
 * Sample data for development (`npm run db:seed`, after `npm run db:migrate`).
 * Idempotent: rows are matched on unique columns. Every sample account uses SEED_PASSWORD.
 */
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Role } from '@app/common';
import defaultDataSource from '../database/data-source';
import { Department } from '../apps/employee-service/src/entities/department.entity';
import { Employee } from '../apps/employee-service/src/entities/employee.entity';
import { User } from '../apps/auth-service/src/entities/user.entity';

export const SEED_PASSWORD = 'Password123!';

const DEPARTMENTS = ['Human Resources', 'Engineering', 'Finance', 'Marketing', 'Operations'];

const EMPLOYEES = [
  {
    employeeCode: 'EMP001',
    fullName: 'Rina Wijaya',
    email: 'hr@dexa.test',
    phone: '+6281200000001',
    department: 'Human Resources',
    position: 'HR Manager',
    joinDate: '2021-03-01',
    role: Role.HR_ADMIN,
  },
  {
    employeeCode: 'EMP002',
    fullName: 'Budi Santoso',
    email: 'budi@dexa.test',
    phone: '+6281200000002',
    department: 'Engineering',
    position: 'Software Engineer',
    joinDate: '2022-01-10',
    role: Role.EMPLOYEE,
  },
  {
    employeeCode: 'EMP003',
    fullName: 'Siti Rahmawati',
    email: 'siti@dexa.test',
    phone: '+6281200000003',
    department: 'Finance',
    position: 'Financial Analyst',
    joinDate: '2022-06-15',
    role: Role.EMPLOYEE,
  },
  {
    employeeCode: 'EMP004',
    fullName: 'Andi Pratama',
    email: 'andi@dexa.test',
    phone: '+6281200000004',
    department: 'Marketing',
    position: 'Digital Marketing Specialist',
    joinDate: '2023-02-01',
    role: Role.EMPLOYEE,
  },
  {
    employeeCode: 'EMP005',
    fullName: 'Dewi Lestari',
    email: 'dewi@dexa.test',
    phone: '+6281200000005',
    department: 'Engineering',
    position: 'QA Engineer',
    joinDate: '2023-08-21',
    role: Role.EMPLOYEE,
  },
];

/** Also used by the e2e tests to fill their own database. */
export async function seedSampleData(
  dataSource: DataSource,
  log: (line: string) => void = console.log,
): Promise<void> {
  const departmentRepo = dataSource.getRepository(Department);
  const employeeRepo = dataSource.getRepository(Employee);
  const userRepo = dataSource.getRepository(User);

  // Find-then-save: TypeORM's upsert() throws on MySQL for existing rows (no insert ID returned).
  const departmentIdByName = new Map<string, number>();
  for (const name of DEPARTMENTS) {
    const department =
      (await departmentRepo.findOneBy({ name })) ??
      (await departmentRepo.save(departmentRepo.create({ name })));
    departmentIdByName.set(name, department.id);
  }
  log(`  ✓ ${departmentIdByName.size} departments`);

  const passwordHash = await hash(SEED_PASSWORD, 10);
  for (const item of EMPLOYEES) {
    const existingEmployee = await employeeRepo.findOneBy({ employeeCode: item.employeeCode });
    const employee = await employeeRepo.save(
      employeeRepo.merge(existingEmployee ?? employeeRepo.create(), {
        employeeCode: item.employeeCode,
        fullName: item.fullName,
        email: item.email,
        phone: item.phone,
        departmentId: departmentIdByName.get(item.department)!,
        position: item.position,
        joinDate: item.joinDate,
        isActive: true,
      }),
    );

    const existingUser = await userRepo.findOneBy({ employeeId: employee.id });
    await userRepo.save(
      userRepo.merge(existingUser ?? userRepo.create(), {
        employeeId: employee.id,
        employeeCode: item.employeeCode,
        email: item.email,
        passwordHash,
        role: item.role,
        isActive: true,
        // Sample accounts are ready to use; real new hires get a temporary password instead.
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      }),
    );
    log(`  ✓ ${item.employeeCode} ${item.fullName} (${item.role}), login: ${item.email}`);
  }
}

async function main() {
  await defaultDataSource.initialize();
  if (await defaultDataSource.showMigrations()) {
    throw new Error('Pending migrations. Run `npm run db:migrate` first.');
  }
  console.log('Connected, seeding...');
  await seedSampleData(defaultDataSource);
  await defaultDataSource.destroy();
  console.log('Seeding done.');
}

// Only when run as a script (`npm run db:seed`), not when imported by a test.
if (require.main === module) {
  main().catch(async (error) => {
    console.error('Seeding failed:', error instanceof Error ? error.message : error);
    if (defaultDataSource.isInitialized) await defaultDataSource.destroy();
    process.exit(1);
  });
}
