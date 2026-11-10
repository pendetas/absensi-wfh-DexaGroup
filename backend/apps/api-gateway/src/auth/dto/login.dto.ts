import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'hr@dexa.test' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(100, { message: 'Email maksimal 100 karakter' })
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString({ message: 'Password harus berupa teks' })
  @IsNotEmpty({ message: 'Password wajib diisi' })
  @MaxLength(100, { message: 'Password maksimal 100 karakter' })
  password: string;
}
