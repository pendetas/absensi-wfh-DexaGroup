/** TCP message patterns, shared so the gateway's send() and each @MessagePattern always match. */
export const AUTH_PATTERNS = {
  HEALTH: 'auth.health',
  LOGIN: 'auth.login',
} as const;

export const EMPLOYEE_PATTERNS = {
  HEALTH: 'employee.health',
  FIND_ALL: 'employee.findAll',
  FIND_BY_ID: 'employee.findById',
} as const;

export const ATTENDANCE_PATTERNS = {
  HEALTH: 'attendance.health',
} as const;
