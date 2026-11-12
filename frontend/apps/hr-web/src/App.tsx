import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';
import {
  AccountPage,
  ApiError,
  AppShell,
  AuthProvider,
  Button,
  ChangePasswordPage,
  type NavItem,
  NotFoundPage,
  SessionGate,
  StateMessage,
  ToastProvider,
  useAuth,
  useCurrentUser,
} from '@dexa/shared-ui';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { SettingsPage } from './pages/SettingsPage';

const EMPLOYEE_APP_URL =
  (import.meta.env.VITE_EMPLOYEE_APP_URL as string | undefined) ?? 'http://localhost:5173';

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
  { to: '/', label: 'Absensi', icon: 'clock', end: true },
  { to: '/karyawan', label: 'Karyawan', icon: 'users' },
  { to: '/pengaturan', label: 'Pengaturan', icon: 'sliders' },
  { to: '/akun', label: 'Akun', icon: 'user' },
];

/** Shown to a logged-in employee who is not an HR admin. */
function NoAccess() {
  const { logout } = useAuth();
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <StateMessage
        title="Akun ini tidak memiliki akses HR"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href={EMPLOYEE_APP_URL}
              className="inline-flex min-h-11 items-center rounded-md bg-brand px-4 font-semibold text-white hover:bg-brand-strong"
            >
              Buka aplikasi absensi
            </a>
            <Button onClick={() => void logout()}>Keluar</Button>
          </div>
        }
      >
        Aplikasi ini hanya untuk admin HR. Untuk mencatat kehadiran, gunakan aplikasi absensi.
      </StateMessage>
    </main>
  );
}

function Pages() {
  const { employee } = useCurrentUser();
  return (
    <AppShell appLabel="HR" nav={NAV} userName={employee.fullName} userCode={employee.employeeCode}>
      <Routes>
        <Route index element={<MonitoringPage />} />
        <Route path="karyawan" element={<EmployeesPage />} />
        <Route path="karyawan/:id" element={<EmployeeDetailPage />} />
        <Route path="pengaturan" element={<SettingsPage />} />
        <Route
          path="akun"
          element={
            <AccountPage otherApp={{ label: 'Catat absensi saya', href: EMPLOYEE_APP_URL }} />
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
            <SessionGate
              appLabel="HR"
              loginIntro="Pantau absensi dan kelola data karyawan."
              requiredRole="HR_ADMIN"
              denied={<NoAccess />}
            >
              <Pages />
            </SessionGate>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
