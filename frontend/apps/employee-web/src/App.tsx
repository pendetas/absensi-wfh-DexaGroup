import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';
import {
  AccountPage,
  ApiError,
  AppShell,
  AuthProvider,
  ChangePasswordPage,
  type NavItem,
  NotFoundPage,
  SessionGate,
  ToastProvider,
  useCurrentUser,
} from '@dexa/shared-ui';
import { HistoryPage } from './pages/HistoryPage';
import { TodayPage } from './pages/TodayPage';

const HR_APP_URL =
  (import.meta.env.VITE_HR_APP_URL as string | undefined) ?? 'http://localhost:5174';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // A 4xx is an answer, not a glitch; only network and server errors are worth a retry.
      retry: (failures, error) =>
        failures < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});

const NAV: NavItem[] = [
  { to: '/', label: 'Hari ini', icon: 'clock', end: true },
  { to: '/riwayat', label: 'Riwayat', icon: 'list' },
  { to: '/akun', label: 'Akun', icon: 'user' },
];

function Pages() {
  const { user, employee } = useCurrentUser();
  return (
    <AppShell nav={NAV} userName={employee.fullName} userCode={employee.employeeCode}>
      <Routes>
        <Route index element={<TodayPage />} />
        <Route path="riwayat" element={<HistoryPage />} />
        <Route
          path="akun"
          element={
            <AccountPage
              otherApp={
                user.role === 'HR_ADMIN'
                  ? { label: 'Buka aplikasi HR', href: HR_APP_URL }
                  : undefined
              }
            />
          }
        />
        <Route path="ganti-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <SessionGate loginIntro="Catat kehadiran kerja dari rumah dengan foto.">
              <Pages />
            </SessionGate>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
