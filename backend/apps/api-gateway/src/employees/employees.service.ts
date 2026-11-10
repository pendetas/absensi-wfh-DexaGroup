import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  type AccountSummary,
  AUTH_PATTERNS,
  AUTH_SERVICE,
  EMPLOYEE_PATTERNS,
  EMPLOYEE_SERVICE,
  type EmployeeDto,
  type JwtPayload,
  type Paginated,
  Role,
  type TemporaryPasswordResult,
} from '@app/common';
import { callService } from '../common/service-client';
import { CreateEmployeeDto, ListEmployeesQueryDto, UpdateEmployeeDto } from './dto/employee.dto';

export type EmployeeWithAccount = EmployeeDto & { account: AccountSummary | null };

/**
 * Employee data lives in employee-service and logins in auth-service, with no shared transaction.
 * When the second call fails, the first one is undone (a compensating action).
 */
@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
  ) {}

  async list(query: ListEmployeesQueryDto): Promise<Paginated<EmployeeWithAccount>> {
    const page = await callService<Paginated<EmployeeDto>>(
      this.employeeClient,
      EMPLOYEE_PATTERNS.FIND_ALL,
      query,
    );
    return { ...page, data: await this.withAccounts(page.data) };
  }

  async get(id: number): Promise<EmployeeWithAccount> {
    const [employee] = await this.withAccounts([await this.findEmployee(id)]);
    return employee;
  }

  async create(dto: CreateEmployeeDto) {
    const { role = Role.EMPLOYEE, ...fields } = dto;
    const employee = await callService<EmployeeDto>(
      this.employeeClient,
      EMPLOYEE_PATTERNS.CREATE,
      fields,
    );

    try {
      const { temporaryPassword } = await callService<TemporaryPasswordResult>(
        this.authClient,
        AUTH_PATTERNS.CREATE_ACCOUNT,
        {
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          email: employee.email,
          role,
        },
      );
      return { employee: await this.get(employee.id), temporaryPassword };
    } catch (error) {
      await this.compensate('delete employee without account', () =>
        callService(this.employeeClient, EMPLOYEE_PATTERNS.DELETE, { id: employee.id }),
      );
      throw error;
    }
  }

  async update(id: number, dto: UpdateEmployeeDto): Promise<EmployeeWithAccount> {
    const before = await this.findEmployee(id);
    await callService(this.employeeClient, EMPLOYEE_PATTERNS.UPDATE, { id, changes: dto });

    const emailChanged = dto.email !== undefined && dto.email.toLowerCase() !== before.email;
    if (emailChanged) {
      try {
        await callService(this.authClient, AUTH_PATTERNS.UPDATE_EMAIL, {
          employeeId: id,
          email: dto.email,
        });
      } catch (error) {
        await this.compensate('restore employee email', () =>
          callService(this.employeeClient, EMPLOYEE_PATTERNS.UPDATE, {
            id,
            changes: { email: before.email },
          }),
        );
        throw error;
      }
    }
    return this.get(id);
  }

  async updateRole(id: number, role: Role, actor: JwtPayload): Promise<EmployeeWithAccount> {
    this.assertNotSelf(id, actor, 'Anda tidak dapat mengubah role akun Anda sendiri');
    await this.findEmployee(id);
    await callService(this.authClient, AUTH_PATTERNS.UPDATE_ROLE, { employeeId: id, role });
    return this.get(id);
  }

  async deactivate(id: number, actor: JwtPayload): Promise<EmployeeWithAccount> {
    this.assertNotSelf(id, actor, 'Anda tidak dapat menonaktifkan akun Anda sendiri');
    const employee = await this.findEmployee(id);
    if (!employee.isActive) throw new ConflictException('Karyawan sudah nonaktif');

    await callService(this.employeeClient, EMPLOYEE_PATTERNS.SET_ACTIVE, { id, isActive: false });
    try {
      await callService(this.authClient, AUTH_PATTERNS.DEACTIVATE, { employeeId: id });
    } catch (error) {
      await this.compensate('restore active employee', () =>
        callService(this.employeeClient, EMPLOYEE_PATTERNS.SET_ACTIVE, { id, isActive: true }),
      );
      throw error;
    }
    return this.get(id);
  }

  async reactivate(id: number) {
    const employee = await this.findEmployee(id);
    if (employee.isActive) throw new ConflictException('Karyawan sudah aktif');

    await callService(this.employeeClient, EMPLOYEE_PATTERNS.SET_ACTIVE, { id, isActive: true });
    try {
      const { temporaryPassword } = await callService<TemporaryPasswordResult>(
        this.authClient,
        AUTH_PATTERNS.REACTIVATE,
        { employeeId: id },
      );
      return { employee: await this.get(id), temporaryPassword };
    } catch (error) {
      await this.compensate('restore inactive employee', () =>
        callService(this.employeeClient, EMPLOYEE_PATTERNS.SET_ACTIVE, { id, isActive: false }),
      );
      throw error;
    }
  }

  async resetPassword(id: number, actor: JwtPayload): Promise<TemporaryPasswordResult> {
    this.assertNotSelf(id, actor, 'Gunakan menu Ganti Password untuk akun Anda sendiri');
    await this.findEmployee(id);
    return callService<TemporaryPasswordResult>(this.authClient, AUTH_PATTERNS.RESET_PASSWORD, {
      employeeId: id,
    });
  }

  private findEmployee(id: number): Promise<EmployeeDto> {
    return callService<EmployeeDto>(this.employeeClient, EMPLOYEE_PATTERNS.FIND_BY_ID, { id });
  }

  private async withAccounts(employees: EmployeeDto[]): Promise<EmployeeWithAccount[]> {
    const accounts = await callService<AccountSummary[]>(
      this.authClient,
      AUTH_PATTERNS.FIND_ACCOUNTS,
      { employeeIds: employees.map((employee) => employee.id) },
    );
    const byEmployeeId = new Map(accounts.map((account) => [account.employeeId, account]));
    return employees.map((employee) => ({
      ...employee,
      account: byEmployeeId.get(employee.id) ?? null,
    }));
  }

  // HR can never lock themselves out, which also guarantees at least one HR admin remains.
  private assertNotSelf(id: number, actor: JwtPayload, message: string): void {
    if (actor.employeeId === id) throw new BadRequestException(message);
  }

  /** A failed compensation leaves the two services out of sync, so it must be visible in logs. */
  private async compensate(action: string, undo: () => Promise<unknown>): Promise<void> {
    try {
      await undo();
    } catch (error) {
      this.logger.error(
        `Compensation failed (${action}); manual fix needed`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
