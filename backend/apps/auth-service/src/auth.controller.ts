import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { AUTH_PATTERNS, type LoginPayload } from '@app/common';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
  ) {}

  @MessagePattern(AUTH_PATTERNS.HEALTH)
  async health() {
    await this.dataSource.query('SELECT 1');
    return { service: 'auth-service', status: 'ok', database: 'connected' };
  }

  // Already validated by LoginDto at the gateway.
  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() payload: LoginPayload) {
    return this.authService.login(payload);
  }
}
