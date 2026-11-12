import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_POLICY_MESSAGE,
} from '@app/common';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString({ message: 'Password saat ini wajib diisi' })
  @IsNotEmpty({ message: 'Password saat ini wajib diisi' })
  @MaxLength(100)
  currentPassword: string;

  @ApiProperty({
    example: 'PasswordBaru1',
    description: '8 to 72 characters with a letter and a digit',
  })
  @IsString({ message: PASSWORD_POLICY_MESSAGE })
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_POLICY_MESSAGE })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: `Password maksimal ${PASSWORD_MAX_LENGTH} karakter` })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_POLICY_MESSAGE })
  newPassword: string;
}
