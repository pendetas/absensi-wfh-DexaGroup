import { useQuery } from '@tanstack/react-query';
import { type AccountStatus, api, type Department } from '@dexa/shared-ui';

/** Departments are a fixed list, so they are fetched once and kept for the session. */
export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get<Department[]>('/departments'),
    staleTime: Infinity,
  });
}

export const ACCOUNT_STATUS: Record<
  AccountStatus,
  { label: string; tone: 'ok' | 'warn' | 'muted' }
> = {
  ACTIVE: { label: 'Aktif', tone: 'ok' },
  PASSWORD_CHANGE_REQUIRED: { label: 'Belum ganti password', tone: 'warn' },
  LOCKED: { label: 'Terkunci sementara', tone: 'warn' },
  INACTIVE: { label: 'Nonaktif', tone: 'muted' },
};
