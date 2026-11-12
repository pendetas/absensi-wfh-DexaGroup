import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type JwtPayload, Role } from '@app/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateEmployeeDto,
  ListEmployeesQueryDto,
  UpdateEmployeeDto,
  UpdateRoleDto,
} from './dto/employee.dto';
import { EmployeesService } from './employees.service';

/** HR only: the class-level @Roles applies to every route here. */
@ApiTags('Employees (HR)')
@ApiBearerAuth()
@Roles(Role.HR_ADMIN)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'List employees with search, filters and pagination' })
  list(@Query() query: ListEmployeesQueryDto) {
    return this.employeesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One employee with their account status' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add an employee; the temporary password is returned once' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee data' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Change role (not for your own account)' })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.employeesService.updateRole(id, dto.role, actor);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate an employee; all their sessions end' })
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: JwtPayload) {
    return this.employeesService.deactivate(id, actor);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate; issues a new temporary password' })
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.reactivate(id);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password; issues a new temporary password' })
  resetPassword(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: JwtPayload) {
    return this.employeesService.resetPassword(id, actor);
  }
}
