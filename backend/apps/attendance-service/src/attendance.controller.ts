import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { ATTENDANCE_PATTERNS } from '@app/common';

@Controller()
export class AttendanceController {
  constructor(private readonly dataSource: DataSource) {}

  @MessagePattern(ATTENDANCE_PATTERNS.HEALTH)
  async health() {
    await this.dataSource.query('SELECT 1');
    return { service: 'attendance-service', status: 'ok', database: 'connected' };
  }
}
