import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { hashSync } from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role, RpcErrorPayload } from '@app/common';
import { AuthService, LOCK_MINUTES, MAX_FAILED_LOGINS } from './auth.service';
import { User } from './entities/user.entity';
import { SessionService } from './session.service';

const PASSWORD = 'Password123!';
// Cost 4 keeps the suite fast; production uses BCRYPT_ROUNDS.
const PASSWORD_HASH = hashSync(PASSWORD, 4);
const INVALID_CREDENTIALS = 'Email/NIK atau password salah';

async function rpcErrorOf(promise: Promise<unknown>): Promise<RpcErrorPayload> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RpcException) return error.getError() as RpcErrorPayload;
    throw error;
  }
  throw new Error('Expected the call to be rejected');
}

describe('AuthService.login', () => {
  let user: User;
  let userRepository: jest.Mocked<Pick<Repository<User>, 'findOneBy' | 'save'>>;
  let sessionService: jest.Mocked<Pick<SessionService, 'start'>>;
  let service: AuthService;

  const login = (identifier: string, password: string, rememberDevice = false) =>
    service.login({ identifier, password, rememberDevice, userAgent: 'jest', ipAddress: '::1' });

  beforeEach(() => {
    user = {
      id: 2,
      employeeId: 2,
      employeeCode: 'EMP002',
      email: 'budi@dexa.test',
      passwordHash: PASSWORD_HASH,
      role: Role.EMPLOYEE,
      isActive: true,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    } as User;
    userRepository = {
      findOneBy: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockImplementation((entity: User) => Promise.resolve(entity)),
    };
    sessionService = { start: jest.fn().mockResolvedValue({}) };
    service = new AuthService(
      userRepository as unknown as Repository<User>,
      sessionService as unknown as SessionService,
    );
  });

  it('looks an identifier with @ up as a lowercased email', async () => {
    await login('  Budi@Dexa.Test ', PASSWORD);
    expect(userRepository.findOneBy).toHaveBeenCalledWith({ email: 'budi@dexa.test' });
  });

  it('looks any other identifier up as an uppercased NIK', async () => {
    await login('emp002', PASSWORD);
    expect(userRepository.findOneBy).toHaveBeenCalledWith({ employeeCode: 'EMP002' });
  });

  it('starts a session, passing on the trusted-device choice, and clears failed attempts', async () => {
    user.failedLoginAttempts = 3;

    await login('budi@dexa.test', PASSWORD, true);

    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lastLoginAt).toBeInstanceOf(Date);
    expect(sessionService.start).toHaveBeenCalledWith(user, true, {
      userAgent: 'jest',
      ipAddress: '::1',
    });
  });

  it('gives the same error for an unknown account and a wrong password', async () => {
    const wrongPassword = await rpcErrorOf(login('budi@dexa.test', 'wrong-pass1'));
    userRepository.findOneBy.mockResolvedValue(null);
    const unknownAccount = await rpcErrorOf(login('nobody@dexa.test', PASSWORD));

    expect(wrongPassword).toEqual({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: INVALID_CREDENTIALS,
    });
    expect(unknownAccount).toEqual(wrongPassword);
    expect(sessionService.start).not.toHaveBeenCalled();
  });

  it(`locks the account for ${LOCK_MINUTES} minutes on wrong password number ${MAX_FAILED_LOGINS}`, async () => {
    for (let attempt = 1; attempt < MAX_FAILED_LOGINS; attempt++) {
      const error = await rpcErrorOf(login('budi@dexa.test', 'wrong-pass1'));
      expect(error.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    }
    expect(user.failedLoginAttempts).toBe(MAX_FAILED_LOGINS - 1);
    expect(user.lockedUntil).toBeNull();

    const error = await rpcErrorOf(login('budi@dexa.test', 'wrong-pass1'));

    expect(error.statusCode).toBe(HttpStatus.LOCKED);
    expect(error.message).toContain(`${LOCK_MINUTES} menit`);
    const lockedForMs = user.lockedUntil!.getTime() - Date.now();
    expect(lockedForMs).toBeGreaterThan((LOCK_MINUTES - 1) * 60_000);
    expect(lockedForMs).toBeLessThanOrEqual(LOCK_MINUTES * 60_000);
  });

  it('refuses even the correct password while the account is locked', async () => {
    user.lockedUntil = new Date(Date.now() + 5 * 60_000);

    const error = await rpcErrorOf(login('budi@dexa.test', PASSWORD));

    expect(error.statusCode).toBe(HttpStatus.LOCKED);
    expect(sessionService.start).not.toHaveBeenCalled();
  });

  it('lets the user in again once the lock has expired', async () => {
    user.lockedUntil = new Date(Date.now() - 1000);

    await login('budi@dexa.test', PASSWORD);

    expect(user.lockedUntil).toBeNull();
    expect(sessionService.start).toHaveBeenCalled();
  });

  it('tells a deactivated employee so only after the correct password', async () => {
    user.isActive = false;

    const wrongPassword = await rpcErrorOf(login('budi@dexa.test', 'wrong-pass1'));
    const rightPassword = await rpcErrorOf(login('budi@dexa.test', PASSWORD));

    expect(wrongPassword.message).toBe(INVALID_CREDENTIALS);
    expect(rightPassword.statusCode).toBe(HttpStatus.FORBIDDEN);
    expect(sessionService.start).not.toHaveBeenCalled();
  });
});
