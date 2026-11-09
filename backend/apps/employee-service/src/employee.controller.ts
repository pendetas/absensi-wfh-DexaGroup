import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { EMPLOYEE_PATTERNS } from '@app/common';

@Controller()
export class EmployeeController {
  constructor(private readonly dataSource: DataSource) {}

  @MessagePattern(EMPLOYEE_PATTERNS.HEALTH)
  async health() {
    await this.dataSource.query('SELECT 1');
    return { service: 'employee-service', status: 'ok', database: 'connected' };
  }
}
