import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'hr@dexa.test', description: 'Email or NIK (e.g. EMP001)' })
  @IsString({ message: 'Email atau NIK wajib diisi' })
  @IsNotEmpty({ message: 'Email atau NIK wajib diisi' })
  @MaxLength(100, { message: 'Email atau NIK maksimal 100 karakter' })
  identifier: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString({ message: 'Password harus berupa teks' })
  @IsNotEmpty({ message: 'Password wajib diisi' })
  @MaxLength(100, { message: 'Password maksimal 100 karakter' })
  password: string;

  @ApiPropertyOptional({ default: false, description: 'Trust this device for 7 days' })
  @IsOptional()
  @IsBoolean({ message: 'rememberDevice harus bernilai true atau false' })
  rememberDevice?: boolean;
}
