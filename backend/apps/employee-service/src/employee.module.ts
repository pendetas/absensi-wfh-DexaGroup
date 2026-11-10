import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule, DatabaseModule } from '@app/common';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { Department } from './entities/department.entity';
import { Employee } from './entities/employee.entity';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    // The only tables employee-service may query.
    TypeOrmModule.forFeature([Department, Employee]),
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
