import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { EMPLOYEE_PATTERNS } from '@app/common';
import { EmployeeService } from './employee.service';

@Controller()
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly dataSource: DataSource,
  ) {}

  @MessagePattern(EMPLOYEE_PATTERNS.HEALTH)
  async health() {
    await this.dataSource.query('SELECT 1');
    return { service: 'employee-service', status: 'ok', database: 'connected' };
  }

  @MessagePattern(EMPLOYEE_PATTERNS.FIND_ALL)
  findAll() {
    return this.employeeService.findAll();
  }

  @MessagePattern(EMPLOYEE_PATTERNS.FIND_BY_ID)
  findById(@Payload() payload: { id: number }) {
    return this.employeeService.findById(payload.id);
  }
}
