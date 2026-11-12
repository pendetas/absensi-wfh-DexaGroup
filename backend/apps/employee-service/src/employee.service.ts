import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Not, QueryFailedError, Repository } from 'typeorm';
import {
  CreateEmployeePayload,
  EmployeeStatusFilter,
  FindEmployeesPayload,
  Paginated,
  rpcError,
  UpdateEmployeePayload,
} from '@app/common';
import { nextEmployeeCode } from './employee-code';
import { Department } from './entities/department.entity';
import { Employee } from './entities/employee.entity';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll({
    search,
    departmentId,
    status,
    joinedOnOrBefore,
    alwaysIncludeIds,
    ids,
    excludeIds,
    page,
    limit,
  }: FindEmployeesPayload): Promise<Paginated<Employee>> {
    const query = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department')
      .orderBy('employee.employeeCode', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const eligibility = [
      status !== EmployeeStatusFilter.ALL && 'employee.isActive = :isActive',
      joinedOnOrBefore && 'employee.joinDate <= :joinedOnOrBefore',
    ].filter(Boolean);
    if (eligibility.length > 0) {
      const eligible = `(${eligibility.join(' AND ')})`;
      // e.g. a since-deactivated employee who has a record on the date HR is viewing.
      query.andWhere(
        alwaysIncludeIds?.length
          ? `(${eligible} OR employee.id IN (:...alwaysIncludeIds))`
          : eligible,
        { isActive: status === EmployeeStatusFilter.ACTIVE, joinedOnOrBefore, alwaysIncludeIds },
      );
    }
    if (ids) {
      query.andWhere(ids.length > 0 ? 'employee.id IN (:...ids)' : '1 = 0', { ids });
    }
    if (excludeIds?.length) {
      query.andWhere('employee.id NOT IN (:...excludeIds)', { excludeIds });
    }
    if (departmentId) {
      query.andWhere('employee.departmentId = :departmentId', { departmentId });
    }
    if (search?.trim()) {
      const term = `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`;
      query.andWhere(
        new Brackets((where) =>
          where
            .where('employee.fullName LIKE :term', { term })
            .orWhere('employee.employeeCode LIKE :term', { term })
            .orWhere('employee.email LIKE :term', { term }),
        ),
      );
    }

    const [data, total] = await query.getManyAndCount();
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: number): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: { department: true },
    });
    if (!employee) {
      throw rpcError(HttpStatus.NOT_FOUND, `Karyawan dengan id ${id} tidak ditemukan`);
    }
    return employee;
  }

  async create(payload: CreateEmployeePayload): Promise<Employee> {
    await this.assertDepartmentExists(payload.departmentId);
    await this.assertEmailAvailable(payload.email);

    // The next code is read and inserted in one transaction; the row lock on the newest
    // employee makes concurrent creates wait instead of picking the same number.
    const id = await this.dataSource.transaction(async (manager) => {
      // Newest row, not highest code: as strings, EMP999 sorts after EMP1000.
      const newest = await manager
        .getRepository(Employee)
        .createQueryBuilder('employee')
        .setLock('pessimistic_write')
        .orderBy('employee.id', 'DESC')
        .limit(1)
        .getOne();

      const saved = await manager.getRepository(Employee).save(
        manager.getRepository(Employee).create({
          ...payload,
          email: payload.email.toLowerCase(),
          employeeCode: nextEmployeeCode(newest?.employeeCode ?? null),
          isActive: true,
        }),
      );
      return saved.id;
    });
    return this.findById(id);
  }

  async update({ id, changes }: UpdateEmployeePayload): Promise<Employee> {
    await this.findById(id);
    if (Object.keys(changes).length === 0) return this.findById(id);
    if (changes.departmentId !== undefined) await this.assertDepartmentExists(changes.departmentId);
    if (changes.email !== undefined) await this.assertEmailAvailable(changes.email, id);

    // The unique index is the final guard when two updates race past assertEmailAvailable.
    try {
      await this.employeeRepository.update(id, {
        ...changes,
        ...(changes.email !== undefined ? { email: changes.email.toLowerCase() } : {}),
      });
    } catch (error) {
      if (error instanceof QueryFailedError && error.message.includes('Duplicate entry')) {
        throw rpcError(HttpStatus.CONFLICT, 'Email sudah digunakan oleh karyawan lain');
      }
      throw error;
    }
    return this.findById(id);
  }

  async setActive(id: number, isActive: boolean): Promise<Employee> {
    await this.findById(id);
    await this.employeeRepository.update(id, { isActive });
    return this.findById(id);
  }

  /** Compensation only: undoes a create whose login account could not be made. */
  async delete(id: number): Promise<void> {
    await this.employeeRepository.delete(id);
  }

  findDepartments(): Promise<Department[]> {
    return this.departmentRepository.find({ order: { name: 'ASC' } });
  }

  private async assertDepartmentExists(id: number): Promise<void> {
    if (!(await this.departmentRepository.existsBy({ id }))) {
      throw rpcError(HttpStatus.BAD_REQUEST, 'Departemen tidak ditemukan');
    }
  }

  private async assertEmailAvailable(email: string, exceptId?: number): Promise<void> {
    const taken = await this.employeeRepository.existsBy({
      email: email.toLowerCase(),
      ...(exceptId ? { id: Not(exceptId) } : {}),
    });
    if (taken) throw rpcError(HttpStatus.CONFLICT, 'Email sudah digunakan oleh karyawan lain');
  }
}
