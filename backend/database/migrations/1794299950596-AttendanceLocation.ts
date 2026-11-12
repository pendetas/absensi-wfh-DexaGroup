import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttendanceLocation1794299950596 implements MigrationInterface {
  name = 'AttendanceLocation1794299950596';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`attendances\` ADD \`check_in_latitude\` double NULL`);
    await queryRunner.query(`ALTER TABLE \`attendances\` ADD \`check_in_longitude\` double NULL`);
    await queryRunner.query(
      `ALTER TABLE \`attendances\` ADD \`check_in_accuracy_m\` int UNSIGNED NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`attendances\` ADD \`check_out_latitude\` double NULL`);
    await queryRunner.query(`ALTER TABLE \`attendances\` ADD \`check_out_longitude\` double NULL`);
    await queryRunner.query(
      `ALTER TABLE \`attendances\` ADD \`check_out_accuracy_m\` int UNSIGNED NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`attendances\` DROP COLUMN \`check_out_accuracy_m\``);
    await queryRunner.query(`ALTER TABLE \`attendances\` DROP COLUMN \`check_out_longitude\``);
    await queryRunner.query(`ALTER TABLE \`attendances\` DROP COLUMN \`check_out_latitude\``);
    await queryRunner.query(`ALTER TABLE \`attendances\` DROP COLUMN \`check_in_accuracy_m\``);
    await queryRunner.query(`ALTER TABLE \`attendances\` DROP COLUMN \`check_in_longitude\``);
    await queryRunner.query(`ALTER TABLE \`attendances\` DROP COLUMN \`check_in_latitude\``);
  }
}
