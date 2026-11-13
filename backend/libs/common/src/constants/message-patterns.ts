/** TCP message patterns, shared so the gateway's send() and each @MessagePattern always match. */
export const AUTH_PATTERNS = {
  HEALTH: 'auth.health',
  LOGIN: 'auth.login',
  REFRESH: 'auth.refresh',
  LOGOUT: 'auth.logout',
  CHANGE_PASSWORD: 'auth.changePassword',
  CREATE_ACCOUNT: 'auth.account.create',
  UPDATE_EMAIL: 'auth.account.updateEmail',
  UPDATE_ROLE: 'auth.account.updateRole',
  DEACTIVATE: 'auth.account.deactivate',
  REACTIVATE: 'auth.account.reactivate',
  RESET_PASSWORD: 'auth.account.resetPassword',
  FIND_ACCOUNTS: 'auth.account.findByEmployeeIds',
} as const;

export const EMPLOYEE_PATTERNS = {
  HEALTH: 'employee.health',
  FIND_ALL: 'employee.findAll',
  FIND_BY_ID: 'employee.findById',
  CREATE: 'employee.create',
  UPDATE: 'employee.update',
  SET_ACTIVE: 'employee.setActive',
  DELETE: 'employee.delete',
  FIND_DEPARTMENTS: 'employee.departments.findAll',
} as const;

export const ATTENDANCE_PATTERNS = {
  HEALTH: 'attendance.health',
  TODAY: 'attendance.today',
  CHECK_IN: 'attendance.checkIn',
  CHECK_OUT: 'attendance.checkOut',
  FIND_HISTORY: 'attendance.findHistory',
  FIND_BY_DATE: 'attendance.findByDate',
  FIND_PHOTO: 'attendance.photo.find',
  GET_SETTINGS: 'attendance.settings.get',
  UPDATE_SETTINGS: 'attendance.settings.update',
  DESCRIBE_PLACE: 'attendance.place.describe',
} as const;
