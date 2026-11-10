import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type DepartmentDto, EMPLOYEE_PATTERNS, EMPLOYEE_SERVICE, Role } from '@app/common';
import { Roles } from '../common/decorators/roles.decorator';
import { callService } from '../common/service-client';

@ApiTags('Employees (HR)')
@ApiBearerAuth()
@Roles(Role.HR_ADMIN)
@Controller('departments')
export class DepartmentsController {
  constructor(@Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'Daftar departemen (untuk dropdown)' })
  findAll() {
    return callService<DepartmentDto[]>(this.employeeClient, EMPLOYEE_PATTERNS.FIND_DEPARTMENTS);
  }
}
