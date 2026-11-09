/**
 * Role pengguna. Disimpan di tabel `users` (auth-service) dan ikut di dalam token JWT.
 * Dipakai gateway untuk menentukan endpoint mana yang boleh diakses.
 */
export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  HR_ADMIN = 'HR_ADMIN',
}
