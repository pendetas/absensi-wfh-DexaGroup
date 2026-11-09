/**
 * Token injection untuk ClientProxy (koneksi TCP dari gateway ke tiap service).
 * Dipakai di gateway: `@Inject(AUTH_SERVICE) private readonly authClient: ClientProxy`
 */
export const AUTH_SERVICE = 'AUTH_SERVICE';
export const EMPLOYEE_SERVICE = 'EMPLOYEE_SERVICE';
export const ATTENDANCE_SERVICE = 'ATTENDANCE_SERVICE';
