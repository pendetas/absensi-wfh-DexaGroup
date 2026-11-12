import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttendanceRules1794294756241 implements MigrationInterface {
  name = 'AttendanceRules1794294756241';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`attendance_settings\` (\`id\` tinyint UNSIGNED NOT NULL, \`work_start_time\` time NOT NULL, \`updated_by_employee_id\` int NULL, \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    // The app expects this row to exist, so it ships with the schema instead of the seed.
    await queryRunner.query(
      `INSERT INTO \`attendance_settings\` (\`id\`, \`work_start_time\`) VALUES (1, '09:00:00')`,
    );
    // Renamed rather than dropped and re-added (what the generator proposed) to keep any data.
    await queryRunner.query(
      `ALTER TABLE \`attendances\` CHANGE \`notes\` \`check_in_note\` varchar(255) NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`attendances\` ADD \`check_out_note\` varchar(255) NULL`);
    await queryRunner.query(
      `ALTER TABLE \`attendances\` ADD \`status\` enum ('ON_TIME', 'LATE', 'OFF_DAY') NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`attendances\` ADD \`late_minutes\` smallint UNSIGNED NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE \`attendances\` ADD \`work_start_time\` time NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`attendances\` DROP COLUMN \`work_start_time\``);
    await queryRunner.query(`ALTER TABLE \`attendances\` DROP COLUMN \`late_minutes\``);
    await queryRunner.query(`ALTER TABLE \`attendances\` DROP COLUMN \`status\``);
    await queryRunner.query(`ALTER TABLE \`attendances\` DROP COLUMN \`check_out_note\``);
    await queryRunner.query(
      `ALTER TABLE \`attendances\` CHANGE \`check_in_note\` \`notes\` varchar(255) NULL`,
    );
    await queryRunner.query(`DROP TABLE \`attendance_settings\``);
  }
}
