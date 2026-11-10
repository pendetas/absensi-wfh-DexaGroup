import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { Repository } from 'typeorm';
import { JwtPayload, LoginPayload, LoginResult, rpcError } from '@app/common';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login({ email, password }: LoginPayload): Promise<LoginResult> {
    const user = await this.userRepository.findOneBy({ email: email.trim().toLowerCase() });
    const passwordValid = user ? await compare(password, user.passwordHash) : false;

    // One message for unknown email and wrong password, so emails can't be enumerated.
    if (!user || !passwordValid) {
      throw rpcError(HttpStatus.UNAUTHORIZED, 'Email atau password salah');
    }
    if (!user.isActive) {
      throw rpcError(HttpStatus.FORBIDDEN, 'Akun Anda sudah nonaktif. Silakan hubungi HR.');
    }

    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    const payload: JwtPayload = {
      sub: user.id,
      employeeId: user.employeeId,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      expiresIn: Number(this.config.get('JWT_EXPIRES_IN', 28800)),
      user: { id: user.id, employeeId: user.employeeId, email: user.email, role: user.role },
    };
  }
}
