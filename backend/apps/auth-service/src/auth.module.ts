import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule, DatabaseModule } from '@app/common';
import { AccountService } from './account.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Session } from './entities/session.entity';
import { User } from './entities/user.entity';
import { SessionService } from './session.service';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    TypeOrmModule.forFeature([User, Session]),
    // Signs tokens; the gateway verifies them with the same JWT_SECRET.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: Number(config.get('JWT_ACCESS_EXPIRES_IN', 900)) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, AccountService],
})
export class AuthModule {}
