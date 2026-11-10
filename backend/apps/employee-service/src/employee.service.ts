import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rpcError } from '@app/common';
import { Employee } from './entities/employee.entity';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
  ) {}

  findAll(): Promise<Employee[]> {
    return this.employeeRepository.find({
      relations: { department: true },
      order: { employeeCode: 'ASC' },
    });
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
}
