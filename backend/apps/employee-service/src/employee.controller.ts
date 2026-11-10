import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import {
  type CreateEmployeePayload,
  EMPLOYEE_PATTERNS,
  type FindEmployeesPayload,
  type UpdateEmployeePayload,
} from '@app/common';
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
  findAll(@Payload() payload: FindEmployeesPayload) {
    return this.employeeService.findAll(payload);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.FIND_BY_ID)
  findById(@Payload() payload: { id: number }) {
    return this.employeeService.findById(payload.id);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.CREATE)
  create(@Payload() payload: CreateEmployeePayload) {
    return this.employeeService.create(payload);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.UPDATE)
  update(@Payload() payload: UpdateEmployeePayload) {
    return this.employeeService.update(payload);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.SET_ACTIVE)
  setActive(@Payload() payload: { id: number; isActive: boolean }) {
    return this.employeeService.setActive(payload.id, payload.isActive);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.DELETE)
  async delete(@Payload() payload: { id: number }) {
    await this.employeeService.delete(payload.id);
    return { success: true };
  }

  @MessagePattern(EMPLOYEE_PATTERNS.FIND_DEPARTMENTS)
  findDepartments() {
    return this.employeeService.findDepartments();
  }
}
