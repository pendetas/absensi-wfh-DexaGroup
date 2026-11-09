/**
 * "Alamat" pesan antar service. Mirip path route di Express,
 * tetapi dikirim lewat TCP, bukan HTTP.
 *
 * Gateway mengirim:   this.authClient.send(AUTH_PATTERNS.HEALTH, payload)
 * Service menerima:   @MessagePattern(AUTH_PATTERNS.HEALTH)
 *
 * Disimpan di satu tempat supaya pengirim & penerima tidak pernah salah ketik.
 */
export const AUTH_PATTERNS = {
  HEALTH: 'auth.health',
} as const;

export const EMPLOYEE_PATTERNS = {
  HEALTH: 'employee.health',
} as const;

export const ATTENDANCE_PATTERNS = {
  HEALTH: 'attendance.health',
} as const;
