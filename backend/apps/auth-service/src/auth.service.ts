import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash, hashSync } from 'bcryptjs';
import { Repository } from 'typeorm';
import {
  AccessTokenResult,
  ChangePasswordPayload,
  LoginPayload,
  meetsPasswordPolicy,
  PASSWORD_POLICY_MESSAGE,
  rpcError,
  SessionResult,
} from '@app/common';
import { User } from './entities/user.entity';
import { SessionService } from './session.service';

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
export const BCRYPT_ROUNDS = 10;

// Compared against when the identifier is unknown, so response time doesn't reveal valid accounts.
const DUMMY_HASH = hashSync('timing-equalizer', BCRYPT_ROUNDS);

const INVALID_CREDENTIALS = 'Email/NIK atau password salah';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly sessionService: SessionService,
  ) {}

  async login({
    identifier,
    password,
    rememberDevice,
    ...client
  }: LoginPayload): Promise<SessionResult> {
    const user = await this.findByIdentifier(identifier);
    if (!user) {
      await compare(password, DUMMY_HASH);
      throw rpcError(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw rpcError(HttpStatus.LOCKED, this.lockedMessage(user.lockedUntil));
    }

    if (!(await compare(password, user.passwordHash))) {
      await this.registerFailedAttempt(user);
      throw user.lockedUntil
        ? rpcError(HttpStatus.LOCKED, this.lockedMessage(user.lockedUntil))
        : rpcError(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
    }

    // Checked after the password so the account's state isn't revealed to someone guessing.
    if (!user.isActive) {
      throw rpcError(HttpStatus.FORBIDDEN, 'Akun Anda sudah nonaktif. Silakan hubungi HR.');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);
    return this.sessionService.start(user, rememberDevice, client);
  }

  async changePassword({
    userId,
    sessionId,
    currentPassword,
    newPassword,
  }: ChangePasswordPayload): Promise<AccessTokenResult> {
    const user = await this.userRepository.findOneBy({ id: userId, isActive: true });
    if (!user) throw rpcError(HttpStatus.UNAUTHORIZED, 'Sesi tidak valid, silakan login kembali');

    // 400, not 401: a typo here must not log the user out on the frontend.
    if (!(await compare(currentPassword, user.passwordHash))) {
      throw rpcError(HttpStatus.BAD_REQUEST, 'Password saat ini salah');
    }
    if (currentPassword === newPassword) {
      throw rpcError(HttpStatus.BAD_REQUEST, 'Password baru harus berbeda dari password saat ini');
    }
    if (!meetsPasswordPolicy(newPassword)) {
      throw rpcError(HttpStatus.BAD_REQUEST, PASSWORD_POLICY_MESSAGE);
    }

    user.passwordHash = await hash(newPassword, BCRYPT_ROUNDS);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await this.userRepository.save(user);

    // Other devices may be using the old password; keep only the one that changed it.
    await this.sessionService.revokeAllForUser(user.id, sessionId);
    return this.sessionService.issueAccessToken(user, sessionId);
  }

  private findByIdentifier(identifier: string): Promise<User | null> {
    const value = identifier.trim();
    return value.includes('@')
      ? this.userRepository.findOneBy({ email: value.toLowerCase() })
      : this.userRepository.findOneBy({ employeeCode: value.toUpperCase() });
  }

  private async registerFailedAttempt(user: User): Promise<void> {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await this.userRepository.save(user);
  }

  private lockedMessage(lockedUntil: Date): string {
    const minutes = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000));
    return `Akun terkunci sementara karena terlalu banyak percobaan login. Coba lagi dalam ${minutes} menit.`;
  }
}
