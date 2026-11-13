import { Body, Controller, Get, Param, ParseIntPipe, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type JwtPayload, Role } from '@app/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AttendanceService } from './attendance.service';
import {
  HistoryQueryDto,
  MonitoringQueryDto,
  UpdateAttendanceSettingsDto,
} from './dto/attendance.dto';

/** HR only. Attendance records are read-only here: there is no edit or delete route. */
@ApiTags('Attendance monitoring (HR)')
@ApiBearerAuth()
@Roles(Role.HR_ADMIN)
@Controller('attendance')
export class AttendanceMonitoringController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('monitoring')
  @ApiOperation({ summary: 'Everyone expected on a date with their attendance and status' })
  monitoring(@Query() query: MonitoringQueryDto) {
    return this.attendanceService.monitoring(query);
  }

  @Get('employees/:employeeId')
  @ApiOperation({ summary: "One employee's attendance history" })
  employeeHistory(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query() query: HistoryQueryDto,
  ) {
    return this.attendanceService.employeeHistory(employeeId, query);
  }

  @Put('settings')
  @ApiOperation({
    summary: 'Change the work start time and daily hours target; applies from the next check-in',
  })
  updateSettings(@Body() dto: UpdateAttendanceSettingsDto, @CurrentUser() actor: JwtPayload) {
    return this.attendanceService.updateSettings(dto, actor);
  }
}
