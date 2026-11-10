import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import {
  AUTH_PATTERNS,
  type ChangePasswordPayload,
  type CreateAccountPayload,
  type LoginPayload,
  type RefreshPayload,
  Role,
} from '@app/common';
import { AccountService } from './account.service';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

// Payloads are validated by DTOs at the gateway before they reach this service.
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly accountService: AccountService,
    private readonly dataSource: DataSource,
  ) {}

  @MessagePattern(AUTH_PATTERNS.HEALTH)
  async health() {
    await this.dataSource.query('SELECT 1');
    return { service: 'auth-service', status: 'ok', database: 'connected' };
  }

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() payload: LoginPayload) {
    return this.authService.login(payload);
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  refresh(@Payload() { refreshToken, ...client }: RefreshPayload) {
    return this.sessionService.refresh(refreshToken, client);
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  async logout(@Payload() payload: { refreshToken: string }) {
    await this.sessionService.revokeByToken(payload.refreshToken);
    return { success: true };
  }

  @MessagePattern(AUTH_PATTERNS.CHANGE_PASSWORD)
  changePassword(@Payload() payload: ChangePasswordPayload) {
    return this.authService.changePassword(payload);
  }

  @MessagePattern(AUTH_PATTERNS.CREATE_ACCOUNT)
  createAccount(@Payload() payload: CreateAccountPayload) {
    return this.accountService.create(payload);
  }

  @MessagePattern(AUTH_PATTERNS.UPDATE_EMAIL)
  async updateEmail(@Payload() payload: { employeeId: number; email: string }) {
    await this.accountService.updateEmail(payload.employeeId, payload.email);
    return { success: true };
  }

  @MessagePattern(AUTH_PATTERNS.UPDATE_ROLE)
  async updateRole(@Payload() payload: { employeeId: number; role: Role }) {
    await this.accountService.updateRole(payload.employeeId, payload.role);
    return { success: true };
  }

  @MessagePattern(AUTH_PATTERNS.DEACTIVATE)
  async deactivate(@Payload() payload: { employeeId: number }) {
    await this.accountService.deactivate(payload.employeeId);
    return { success: true };
  }

  @MessagePattern(AUTH_PATTERNS.REACTIVATE)
  reactivate(@Payload() payload: { employeeId: number }) {
    return this.accountService.reactivate(payload.employeeId);
  }

  @MessagePattern(AUTH_PATTERNS.RESET_PASSWORD)
  resetPassword(@Payload() payload: { employeeId: number }) {
    return this.accountService.resetPassword(payload.employeeId);
  }

  @MessagePattern(AUTH_PATTERNS.FIND_ACCOUNTS)
  findAccounts(@Payload() payload: { employeeIds: number[] }) {
    return this.accountService.findByEmployeeIds(payload.employeeIds);
  }
}
