import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttendancePlace1794476649637 implements MigrationInterface {
  name = 'AttendancePlace1794476649637';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`attendances\` ADD \`check_in_place\` varchar(160) NULL`);
    await queryRunner.query(
      `ALTER TABLE \`attendances\` ADD \`check_out_place\` varchar(160) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`attendances\` DROP COLUMN \`check_out_place\``);
    await queryRunner.query(`ALTER TABLE \`attendances\` DROP COLUMN \`check_in_place\``);
  }
}
