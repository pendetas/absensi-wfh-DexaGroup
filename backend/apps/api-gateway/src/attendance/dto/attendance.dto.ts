import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { AttendanceStatus, type DailyStatus, NOT_CHECKED_IN } from '@app/common';
import { PageQueryDto, trim } from '../../common/dto/page-query.dto';

const DAILY_STATUSES: DailyStatus[] = [...Object.values(AttendanceStatus), NOT_CHECKED_IN];

/** A real calendar date in YYYY-MM-DD; IsDateString alone also accepts full timestamps. */
function IsCalendarDate() {
  const message = 'Tanggal harus berformat YYYY-MM-DD';
  return applyDecorators(
    IsDateString({ strict: true }, { message }),
    Matches(/^\d{4}-\d{2}-\d{2}$/, { message }),
  );
}

// Multipart fields arrive as strings; an empty one means "not provided", not zero.
const toOptionalNumber = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : Number(value);

const hasCoordinates = (dto: AttendanceProofDto) =>
  dto.latitude !== undefined || dto.longitude !== undefined;

/** What accompanies the photo on check-in and check-out. */
export class AttendanceProofDto {
  @ApiPropertyOptional({ example: 'Listrik padam, mulai telat', maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255, { message: 'Catatan maksimal 255 karakter' })
  note?: string;

  // Latitude and longitude are a pair: sending one makes the other required.
  @ApiPropertyOptional({ example: -6.2088, description: 'Omit if location was not shared' })
  @Transform(toOptionalNumber)
  @ValidateIf(hasCoordinates)
  @IsLatitude({ message: 'Lokasi tidak valid' })
  latitude?: number;

  @ApiPropertyOptional({ example: 106.8456 })
  @Transform(toOptionalNumber)
  @ValidateIf(hasCoordinates)
  @IsLongitude({ message: 'Lokasi tidak valid' })
  longitude?: number;

  @ApiPropertyOptional({ example: 25, description: 'Accuracy radius in metres' })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber({}, { message: 'Lokasi tidak valid' })
  @Min(0, { message: 'Lokasi tidak valid' })
  accuracy?: number;
}

export class HistoryQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    example: '2026-11-01',
    description: "Defaults to the first day of `to`'s month",
  })
  @IsOptional()
  @IsCalendarDate()
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-30', description: 'Defaults to today' })
  @IsOptional()
  @IsCalendarDate()
  to?: string;
}

export class MonitoringQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    example: '2026-11-10',
    description: 'Defaults to today; not in the future',
  })
  @IsOptional()
  @IsCalendarDate()
  date?: string;

  @ApiPropertyOptional({ description: 'Name, NIK or email' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  departmentId?: number;

  @ApiPropertyOptional({ enum: DAILY_STATUSES })
  @IsOptional()
  @IsIn(DAILY_STATUSES, { message: 'Status tidak valid' })
  status?: DailyStatus;
}

/** A device position to describe in words, for the camera screen. */
export class PlaceQueryDto {
  @ApiProperty({ example: -6.8915 })
  @Type(() => Number)
  @IsLatitude({ message: 'Lokasi tidak valid' })
  latitude: number;

  @ApiProperty({ example: 107.6107 })
  @Type(() => Number)
  @IsLongitude({ message: 'Lokasi tidak valid' })
  longitude: number;

  @ApiPropertyOptional({ example: 25, description: 'Accuracy radius in metres' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Lokasi tidak valid' })
  @Min(0, { message: 'Lokasi tidak valid' })
  accuracy?: number;
}

export class UpdateAttendanceSettingsDto {
  @ApiProperty({ example: '09:00', description: '24-hour HH:mm, Jakarta time' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Jam masuk harus berformat HH:mm, mis. 09:00' })
  workStartTime: string;

  @ApiPropertyOptional({
    example: 480,
    description: 'Expected working time per day in minutes (60 to 960); unchanged if omitted',
  })
  @IsOptional()
  @IsInt({ message: 'Target jam kerja harus berupa menit bulat' })
  @Min(60, { message: 'Target jam kerja minimal 1 jam' })
  @Max(960, { message: 'Target jam kerja maksimal 16 jam' })
  dailyWorkMinutes?: number;
}
