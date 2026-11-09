import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule, DatabaseModule } from '@app/common';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [AppConfigModule, DatabaseModule, TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
})
export class AuthModule {}
