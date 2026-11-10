import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { In, Not, Repository } from 'typeorm';
import {
  AccountStatus,
  AccountSummary,
  CreateAccountPayload,
  generateTemporaryPassword,
  Role,
  rpcError,
  TemporaryPasswordResult,
} from '@app/common';
import { BCRYPT_ROUNDS } from './auth.service';
import { User } from './entities/user.entity';
import { SessionService } from './session.service';

/** Account actions triggered by HR through the gateway. */
@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly sessionService: SessionService,
  ) {}

  async create({
    employeeId,
    employeeCode,
    email,
    role,
  }: CreateAccountPayload): Promise<TemporaryPasswordResult> {
    await this.assertEmailAvailable(email);
    const temporaryPassword = generateTemporaryPassword();
    await this.userRepository.save(
      this.userRepository.create({
        employeeId,
        employeeCode,
        email: email.toLowerCase(),
        role,
        passwordHash: await hash(temporaryPassword, BCRYPT_ROUNDS),
        mustChangePassword: true,
      }),
    );
    return { temporaryPassword };
  }

  async updateEmail(employeeId: number, email: string): Promise<void> {
    const user = await this.getByEmployeeId(employeeId);
    await this.assertEmailAvailable(email, user.id);
    user.email = email.toLowerCase();
    await this.userRepository.save(user);
  }

  async updateRole(employeeId: number, role: Role): Promise<void> {
    const user = await this.getByEmployeeId(employeeId);
    user.role = role;
    await this.userRepository.save(user);
    // Existing access tokens carry the old role; end sessions so it can't outlive the change.
    await this.sessionService.revokeAllForUser(user.id);
  }

  async deactivate(employeeId: number): Promise<void> {
    const user = await this.getByEmployeeId(employeeId);
    user.isActive = false;
    await this.userRepository.save(user);
    await this.sessionService.revokeAllForUser(user.id);
  }

  /** The old password may be months old or known to others, so reactivation issues a new one. */
  async reactivate(employeeId: number): Promise<TemporaryPasswordResult> {
    const user = await this.getByEmployeeId(employeeId);
    user.isActive = true;
    return this.issueTemporaryPassword(user);
  }

  async resetPassword(employeeId: number): Promise<TemporaryPasswordResult> {
    const user = await this.getByEmployeeId(employeeId);
    if (!user.isActive) {
      throw rpcError(
        HttpStatus.CONFLICT,
        'Akun nonaktif. Aktifkan kembali karyawan terlebih dahulu.',
      );
    }
    return this.issueTemporaryPassword(user);
  }

  async findByEmployeeIds(employeeIds: number[]): Promise<AccountSummary[]> {
    if (employeeIds.length === 0) return [];
    const users = await this.userRepository.findBy({ employeeId: In(employeeIds) });
    const now = new Date();
    return users.map((user) => ({
      employeeId: user.employeeId,
      role: user.role,
      status: !user.isActive
        ? AccountStatus.INACTIVE
        : user.lockedUntil && user.lockedUntil > now
          ? AccountStatus.LOCKED
          : user.mustChangePassword
            ? AccountStatus.PASSWORD_CHANGE_REQUIRED
            : AccountStatus.ACTIVE,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lockedUntil:
        user.lockedUntil && user.lockedUntil > now ? user.lockedUntil.toISOString() : null,
    }));
  }

  private async issueTemporaryPassword(user: User): Promise<TemporaryPasswordResult> {
    const temporaryPassword = generateTemporaryPassword();
    user.passwordHash = await hash(temporaryPassword, BCRYPT_ROUNDS);
    user.mustChangePassword = true;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);
    await this.sessionService.revokeAllForUser(user.id);
    return { temporaryPassword };
  }

  private async getByEmployeeId(employeeId: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ employeeId });
    if (!user) throw rpcError(HttpStatus.NOT_FOUND, 'Akun karyawan tidak ditemukan');
    return user;
  }

  private async assertEmailAvailable(email: string, exceptUserId?: number): Promise<void> {
    const taken = await this.userRepository.existsBy({
      email: email.toLowerCase(),
      ...(exceptUserId ? { id: Not(exceptUserId) } : {}),
    });
    if (taken) throw rpcError(HttpStatus.CONFLICT, 'Email sudah digunakan oleh akun lain');
  }
}
