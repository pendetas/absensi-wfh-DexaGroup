import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { type JwtPayload, PhotoKind } from '@app/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';
import { AttendanceProofDto, HistoryQueryDto, PlaceQueryDto } from './dto/attendance.dto';
import { PhotoUpload, PhotoValidationPipe } from './photo-upload';

/** Every logged-in user, HR admins included, records their own attendance here. */
@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('today')
  @ApiOperation({ summary: "Today's record, server time and the current work start time" })
  today(@CurrentUser() user: JwtPayload) {
    return this.attendanceService.today(user);
  }

  @Post('check-in')
  @PhotoUpload()
  @ApiOperation({ summary: 'Check in with a camera photo; the server sets the time' })
  checkIn(
    @CurrentUser() user: JwtPayload,
    @UploadedFile(PhotoValidationPipe) photo: Express.Multer.File,
    @Body() dto: AttendanceProofDto,
  ) {
    return this.attendanceService.checkIn(user, photo, dto);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @PhotoUpload()
  @ApiOperation({ summary: "Check out of today's record with a camera photo" })
  checkOut(
    @CurrentUser() user: JwtPayload,
    @UploadedFile(PhotoValidationPipe) photo: Express.Multer.File,
    @Body() dto: AttendanceProofDto,
  ) {
    return this.attendanceService.checkOut(user, photo, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Own attendance history (defaults to the current month)' })
  history(@CurrentUser() user: JwtPayload, @Query() query: HistoryQueryDto) {
    return this.attendanceService.history(user.employeeId, query);
  }

  @Get('place')
  @ApiOperation({ summary: 'Readable place name for a device position (city, area)' })
  place(@Query() query: PlaceQueryDto) {
    return this.attendanceService.describePlace({
      latitude: query.latitude,
      longitude: query.longitude,
      accuracyMeters: query.accuracy === undefined ? null : Math.round(query.accuracy),
    });
  }

  @Get('settings')
  @ApiOperation({ summary: 'Current work start time' })
  settings() {
    return this.attendanceService.settings();
  }

  @Get(':id/photos/:kind')
  @ApiProduces('image/jpeg', 'image/png')
  @ApiOperation({ summary: 'Attendance photo: own records only, or any record for HR' })
  async photo(
    @Param('id', ParseIntPipe) id: number,
    @Param(
      'kind',
      new ParseEnumPipe(PhotoKind, {
        exceptionFactory: () => new NotFoundException('Foto absensi tidak ditemukan'),
      }),
    )
    kind: PhotoKind,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const photo = await this.attendanceService.photo(id, kind, user);
    // Set here, not with @Header(), which would also mark a 404 as cacheable. Photos never
    // change once stored, but they are personal: the browser may cache, proxies may not.
    response.setHeader('Cache-Control', 'private, max-age=3600');
    return new StreamableFile(Buffer.from(photo.dataBase64, 'base64'), {
      type: photo.contentType,
      disposition: 'inline',
    });
  }
}
