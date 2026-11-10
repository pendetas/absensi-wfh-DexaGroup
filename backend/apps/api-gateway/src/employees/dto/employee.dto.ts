import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  EmployeeStatusFilter,
  INDONESIAN_MOBILE_PATTERN,
  normalizeIndonesianPhone,
  Role,
} from '@app/common';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Agus Saputra' })
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
  fullName: string;

  @ApiProperty({ example: 'agus@dexa.test' })
  @Transform(trim)
  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(100, { message: 'Email maksimal 100 karakter' })
  email: string;

  @ApiProperty({ example: '0812-3456-7890', description: 'Disimpan sebagai +62' })
  @Transform(({ value }) => normalizeIndonesianPhone(value))
  @IsString({ message: 'Nomor HP wajib diisi' })
  @Matches(INDONESIAN_MOBILE_PATTERN, {
    message: 'Nomor HP harus nomor seluler Indonesia, mis. 0812xxxxxxxx',
  })
  phone: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt({ message: 'Departemen wajib dipilih' })
  @Min(1, { message: 'Departemen wajib dipilih' })
  departmentId: number;

  @ApiProperty({ example: 'Backend Engineer' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Jabatan wajib diisi' })
  @MaxLength(100, { message: 'Jabatan maksimal 100 karakter' })
  position: string;

  @ApiProperty({ example: '2026-12-01', description: 'Boleh di masa depan' })
  @IsDateString({ strict: true }, { message: 'Tanggal bergabung harus berformat YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tanggal bergabung harus berformat YYYY-MM-DD' })
  joinDate: string;

  @ApiPropertyOptional({ enum: Role, default: Role.EMPLOYEE })
  @IsOptional()
  @IsEnum(Role, { message: 'Role tidak valid' })
  role?: Role;
}

/** Role has its own endpoint so a profile edit can never change access rights by accident. */
export class UpdateEmployeeDto extends PartialType(
  OmitType(CreateEmployeeDto, ['role'] as const),
) {}

export class UpdateRoleDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role, { message: 'Role tidak valid' })
  role: Role;
}

export class ListEmployeesQueryDto {
  @ApiPropertyOptional({ description: 'Cari nama, NIK, atau email' })
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

  @ApiPropertyOptional({ enum: EmployeeStatusFilter, default: EmployeeStatusFilter.ACTIVE })
  @IsOptional()
  @IsEnum(EmployeeStatusFilter, { message: 'Status harus active, inactive, atau all' })
  status: EmployeeStatusFilter = EmployeeStatusFilter.ACTIVE;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
