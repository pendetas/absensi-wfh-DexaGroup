import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule, DatabaseModule } from '@app/common';
import { AttendanceController } from './attendance.controller';
import { Attendance } from './entities/attendance.entity';

@Module({
  imports: [AppConfigModule, DatabaseModule, TypeOrmModule.forFeature([Attendance])],
  controllers: [AttendanceController],
})
export class AttendanceModule {}
