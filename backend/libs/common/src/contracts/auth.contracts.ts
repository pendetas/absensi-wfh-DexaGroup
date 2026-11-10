import { Role } from '../enums/role.enum';

/** `sub` is users.id (the standard JWT subject claim). */
export interface JwtPayload {
  sub: number;
  employeeId: number;
  email: string;
  role: Role;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Safe to send to the frontend: no password hash. */
export interface AuthUser {
  id: number;
  employeeId: number;
  email: string;
  role: Role;
}

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}
