import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { AUTH_PATTERNS } from '@app/common';

@Controller()
export class AuthController {
  constructor(private readonly dataSource: DataSource) {}

  // Di Express: router.get('/health', ...)
  // Di microservice: handler dipanggil berdasarkan "pattern" pesan dari gateway.
  @MessagePattern(AUTH_PATTERNS.HEALTH)
  async health() {
    await this.dataSource.query('SELECT 1');
    return { service: 'auth-service', status: 'ok', database: 'connected' };
  }
}
