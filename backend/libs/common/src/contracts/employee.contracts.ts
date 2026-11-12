export enum EmployeeStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ALL = 'all',
}

export interface FindEmployeesPayload {
  search?: string;
  departmentId?: number;
  status: EmployeeStatusFilter;
  /** Only employees whose join date is on or before this date (YYYY-MM-DD). */
  joinedOnOrBefore?: string;
  /** Included even when the status or join-date filter would drop them. */
  alwaysIncludeIds?: number[];
  /** When set, only these ids can match; an empty list matches nobody. */
  ids?: number[];
  excludeIds?: number[];
  page: number;
  limit: number;
}

export interface CreateEmployeePayload {
  fullName: string;
  email: string;
  phone: string;
  departmentId: number;
  position: string;
  joinDate: string;
}

export type UpdateEmployeeFields = Partial<CreateEmployeePayload>;

export interface UpdateEmployeePayload {
  id: number;
  changes: UpdateEmployeeFields;
}

export interface DepartmentDto {
  id: number;
  name: string;
}

/** Employee as it travels between services (dates already serialized). */
export interface EmployeeDto {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  departmentId: number;
  department: DepartmentDto;
  position: string;
  joinDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
