import { MigrationInterface, QueryRunner } from 'typeorm';

export class DailyWorkTarget1794385200000 implements MigrationInterface {
  name = 'DailyWorkTarget1794385200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 8 hours by default; HR can change it on the Settings page.
    await queryRunner.query(
      `ALTER TABLE \`attendance_settings\` ADD \`daily_work_minutes\` smallint UNSIGNED NOT NULL DEFAULT 480`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`attendance_settings\` DROP COLUMN \`daily_work_minutes\``,
    );
  }
}
