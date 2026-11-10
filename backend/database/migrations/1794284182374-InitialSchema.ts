import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1794284182374 implements MigrationInterface {
  name = 'InitialSchema1794284182374';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`attendances\` (\`id\` int NOT NULL AUTO_INCREMENT, \`employee_id\` int NOT NULL, \`attendance_date\` date NOT NULL, \`check_in_at\` datetime NOT NULL, \`check_in_photo\` varchar(255) NOT NULL, \`check_out_at\` datetime NULL, \`check_out_photo\` varchar(255) NULL, \`notes\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_attendance_date\` (\`attendance_date\`), UNIQUE INDEX \`UQ_attendance_employee_date\` (\`employee_id\`, \`attendance_date\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`employee_id\` int NOT NULL, \`employee_code\` varchar(20) NOT NULL, \`email\` varchar(100) NOT NULL, \`password_hash\` varchar(255) NOT NULL, \`role\` enum ('EMPLOYEE', 'HR_ADMIN') NOT NULL DEFAULT 'EMPLOYEE', \`is_active\` tinyint NOT NULL DEFAULT 1, \`must_change_password\` tinyint NOT NULL DEFAULT 1, \`failed_login_attempts\` tinyint UNSIGNED NOT NULL DEFAULT '0', \`locked_until\` datetime NULL, \`password_changed_at\` datetime NULL, \`last_login_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_9760615d88ed518196bb79ea03\` (\`employee_id\`), UNIQUE INDEX \`IDX_8ae048b57cb451eb306035b1e6\` (\`employee_code\`), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`sessions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`token_hash\` char(64) NOT NULL, \`persistent\` tinyint NOT NULL DEFAULT 0, \`expires_at\` datetime NOT NULL, \`revoked_at\` datetime NULL, \`last_used_at\` datetime NULL, \`user_agent\` varchar(255) NULL, \`ip_address\` varchar(45) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_sessions_user_active\` (\`user_id\`, \`revoked_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`employees\` (\`id\` int NOT NULL AUTO_INCREMENT, \`employee_code\` varchar(20) NOT NULL, \`full_name\` varchar(100) NOT NULL, \`email\` varchar(100) NOT NULL, \`phone\` varchar(20) NULL, \`department_id\` int NOT NULL, \`position\` varchar(100) NOT NULL, \`join_date\` date NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_56162b5f24af743a154680684f\` (\`employee_code\`), UNIQUE INDEX \`IDX_765bc1ac8967533a04c74a9f6a\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`departments\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_8681da666ad9699d568b3e9106\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`sessions\` ADD CONSTRAINT \`FK_085d540d9f418cfbdc7bd55bb19\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`employees\` ADD CONSTRAINT \`FK_678a3540f843823784b0fe4a4f2\` FOREIGN KEY (\`department_id\`) REFERENCES \`departments\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`employees\` DROP FOREIGN KEY \`FK_678a3540f843823784b0fe4a4f2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`sessions\` DROP FOREIGN KEY \`FK_085d540d9f418cfbdc7bd55bb19\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_8681da666ad9699d568b3e9106\` ON \`departments\``);
    await queryRunner.query(`DROP TABLE \`departments\``);
    await queryRunner.query(`DROP INDEX \`IDX_765bc1ac8967533a04c74a9f6a\` ON \`employees\``);
    await queryRunner.query(`DROP INDEX \`IDX_56162b5f24af743a154680684f\` ON \`employees\``);
    await queryRunner.query(`DROP TABLE \`employees\``);
    await queryRunner.query(`DROP INDEX \`IDX_sessions_user_active\` ON \`sessions\``);
    await queryRunner.query(`DROP TABLE \`sessions\``);
    await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
    await queryRunner.query(`DROP INDEX \`IDX_8ae048b57cb451eb306035b1e6\` ON \`users\``);
    await queryRunner.query(`DROP INDEX \`IDX_9760615d88ed518196bb79ea03\` ON \`users\``);
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(`DROP INDEX \`UQ_attendance_employee_date\` ON \`attendances\``);
    await queryRunner.query(`DROP INDEX \`IDX_attendance_date\` ON \`attendances\``);
    await queryRunner.query(`DROP TABLE \`attendances\``);
  }
}
