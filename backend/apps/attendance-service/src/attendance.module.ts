import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule, DatabaseModule } from '@app/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Clock } from './clock';
import { AttendanceSettings } from './entities/attendance-settings.entity';
import { Attendance } from './entities/attendance.entity';
import { PhotoStorageService } from './photo-storage.service';
import { PlaceService } from './place.service';
import { SettingsService } from './settings.service';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    TypeOrmModule.forFeature([Attendance, AttendanceSettings]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, SettingsService, PhotoStorageService, PlaceService, Clock],
})
export class AttendanceModule {}
