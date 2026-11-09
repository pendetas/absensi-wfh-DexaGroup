import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule, DatabaseModule } from '@app/common';
import { EmployeeController } from './employee.controller';
import { Department } from './entities/department.entity';
import { Employee } from './entities/employee.entity';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    // Daftarkan tabel MILIK service ini. Hanya tabel ini yang boleh diakses employee-service.
    TypeOrmModule.forFeature([Department, Employee]),
  ],
  controllers: [EmployeeController],
})
export class EmployeeModule {}
