import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceSettingsDto, UpdateAttendanceSettingsPayload } from '@app/common';
import { AttendanceSettings, SETTINGS_ROW_ID } from './entities/attendance-settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AttendanceSettings)
    private readonly settingsRepository: Repository<AttendanceSettings>,
  ) {}

  async get(): Promise<AttendanceSettingsDto> {
    const settings = await this.settingsRepository.findOneByOrFail({ id: SETTINGS_ROW_ID });
    return {
      workStartTime: settings.workStartTime.slice(0, 5),
      dailyWorkMinutes: settings.dailyWorkMinutes,
      updatedAt: settings.updatedAt.toISOString(),
      updatedByEmployeeId: settings.updatedByEmployeeId,
    };
  }

  /** Applies from the next check-in; existing records keep the start time they were judged by. */
  async update({
    workStartTime,
    dailyWorkMinutes,
    updatedByEmployeeId,
  }: UpdateAttendanceSettingsPayload): Promise<AttendanceSettingsDto> {
    await this.settingsRepository.update(SETTINGS_ROW_ID, {
      workStartTime,
      ...(dailyWorkMinutes !== undefined ? { dailyWorkMinutes } : {}),
      updatedByEmployeeId,
    });
    return this.get();
  }
}
