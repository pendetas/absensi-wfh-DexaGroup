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
  @ApiOperation({ summary: 'Daftar karyawan (cari, filter, paginasi)' })
  list(@Query() query: ListEmployeesQueryDto) {
    return this.employeesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail karyawan beserta status akun' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tambah karyawan; password sementara hanya ditampilkan sekali' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Ubah data karyawan' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Ubah role (tidak bisa untuk akun sendiri)' })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.employeesService.updateRole(id, dto.role, actor);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nonaktifkan karyawan; semua sesinya berakhir' })
  deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: JwtPayload) {
    return this.employeesService.deactivate(id, actor);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aktifkan kembali; menerbitkan password sementara baru' })
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.reactivate(id);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password; menerbitkan password sementara baru' })
  resetPassword(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: JwtPayload) {
    return this.employeesService.resetPassword(id, actor);
  }
}
