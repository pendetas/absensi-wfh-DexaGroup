import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EMPLOYEE_PATTERNS, EMPLOYEE_SERVICE, Role } from '@app/common';
import { Roles } from '../common/decorators/roles.decorator';
import { callService } from '../common/service-client';

/** HR only: the class-level @Roles applies to every route here. */
@ApiTags('Employees (HR)')
@ApiBearerAuth()
@Roles(Role.HR_ADMIN)
@Controller('employees')
export class EmployeesController {
  constructor(@Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy) {}

  @Get()
  @ApiOperation({ summary: 'Daftar semua karyawan' })
  findAll() {
    return callService(this.employeeClient, EMPLOYEE_PATTERNS.FIND_ALL);
  }
}
