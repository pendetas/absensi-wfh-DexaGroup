/**
 * Seed data contoh: departemen, karyawan, dan akun login.
 *
 * Jalankan dari folder backend:  npm run seed
 *
 * Idempotent: aman dijalankan berulang kali. Data dicocokkan berdasarkan kolom unik
 * (nama departemen, kode karyawan, employee_id), jadi tidak akan terbuat dobel.
 *
 * Semua akun contoh memakai password yang sama: lihat SEED_PASSWORD di bawah
 * (khusus untuk development / demo, tercantum juga di README).
 */
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { loadEnv, Role } from '@app/common';
import { Department } from '../apps/employee-service/src/entities/department.entity';
import { Employee } from '../apps/employee-service/src/entities/employee.entity';
import { User } from '../apps/auth-service/src/entities/user.entity';
import { Attendance } from '../apps/attendance-service/src/entities/attendance.entity';

const SEED_PASSWORD = 'Password123!';

const DEPARTMENTS = ['Human Resources', 'Engineering', 'Finance', 'Marketing', 'Operations'];

const EMPLOYEES = [
  { employeeCode: 'EMP001', fullName: 'Rina Wijaya', email: 'hr@dexa.test', phone: '081200000001', department: 'Human Resources', position: 'HR Manager', joinDate: '2021-03-01', role: Role.HR_ADMIN },
  { employeeCode: 'EMP002', fullName: 'Budi Santoso', email: 'budi@dexa.test', phone: '081200000002', department: 'Engineering', position: 'Software Engineer', joinDate: '2022-01-10', role: Role.EMPLOYEE },
  { employeeCode: 'EMP003', fullName: 'Siti Rahmawati', email: 'siti@dexa.test', phone: '081200000003', department: 'Finance', position: 'Financial Analyst', joinDate: '2022-06-15', role: Role.EMPLOYEE },
  { employeeCode: 'EMP004', fullName: 'Andi Pratama', email: 'andi@dexa.test', phone: '081200000004', department: 'Marketing', position: 'Digital Marketing Specialist', joinDate: '2023-02-01', role: Role.EMPLOYEE },
  { employeeCode: 'EMP005', fullName: 'Dewi Lestari', email: 'dewi@dexa.test', phone: '081200000005', department: 'Engineering', position: 'QA Engineer', joinDate: '2023-08-21', role: Role.EMPLOYEE },
];

async function seed() {
  loadEnv();

  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    timezone: process.env.APP_TIMEZONE ?? '+07:00',
    entities: [Department, Employee, User, Attendance],
    // Pastikan semua tabel ada, walaupun service belum pernah dijalankan.
    synchronize: true,
  });
  await dataSource.initialize();
  console.log('Terhubung ke database, mulai seeding...');

  const departmentRepo = dataSource.getRepository(Department);
  const employeeRepo = dataSource.getRepository(Employee);
  const userRepo = dataSource.getRepository(User);

  // Pola "cari dulu, lalu buat atau perbarui" supaya seed bisa dijalankan berulang.
  // (Sengaja tidak memakai repo.upsert(): di TypeORM 0.3 + MySQL, upsert gagal
  //  saat barisnya sudah ada karena MySQL tidak mengembalikan ID baris tersebut.)

  // 1. Departemen
  const departmentIdByName = new Map<string, number>();
  for (const name of DEPARTMENTS) {
    const department =
      (await departmentRepo.findOneBy({ name })) ?? (await departmentRepo.save(departmentRepo.create({ name })));
    departmentIdByName.set(name, department.id);
  }
  console.log(`  ✓ ${departmentIdByName.size} departemen`);

  // 2. Karyawan + akun login
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
        email: item.email,
        passwordHash,
        role: item.role,
        isActive: true,
      }),
    );
    console.log(`  ✓ ${item.employeeCode} ${item.fullName} (${item.role}) - login: ${item.email}`);
  }

  await dataSource.destroy();
  console.log('Seeding selesai.');
}

seed().catch((error) => {
  console.error('Seeding gagal:', error);
  process.exit(1);
});
