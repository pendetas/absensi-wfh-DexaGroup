import { Role } from '../enums/role.enum';

/** `sub` is users.id (the standard JWT subject claim); `sid` is sessions.id. */
export interface JwtPayload {
  sub: number;
  sid: number;
  employeeId: number;
  email: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface ClientInfo {
  userAgent?: string;
  ipAddress?: string;
}

export interface LoginPayload extends ClientInfo {
  /** Email or NIK. */
  identifier: string;
  password: string;
  rememberDevice: boolean;
}

export interface RefreshPayload extends ClientInfo {
  refreshToken: string;
}

/** Safe to send to the frontend: no password hash. */
export interface AuthUser {
  id: number;
  employeeId: number;
  employeeCode: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface AccessTokenResult {
  accessToken: string;
  expiresIn: number;
}

export interface SessionResult extends AccessTokenResult {
  user: AuthUser;
  /** Stays in the gateway: it goes into an httpOnly cookie, never into a response body. */
  refreshToken: string;
  refreshExpiresAt: string;
  persistent: boolean;
}

export interface ChangePasswordPayload {
  userId: number;
  sessionId: number;
  currentPassword: string;
  newPassword: string;
}

export interface CreateAccountPayload {
  employeeId: number;
  employeeCode: string;
  email: string;
  role: Role;
}

export interface TemporaryPasswordResult {
  temporaryPassword: string;
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED',
  LOCKED = 'LOCKED',
  INACTIVE = 'INACTIVE',
}

export interface AccountSummary {
  employeeId: number;
  role: Role;
  status: AccountStatus;
  lastLoginAt: string | null;
  lockedUntil: string | null;
}
