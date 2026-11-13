import type { ReactNode } from 'react';
import { Button } from '../components/Button';
import { errorMessages, PageLoading, StateMessage } from '../components/Feedback';
import type { Role } from '../lib/types';
import { useAuth } from './AuthProvider';
import { ChangePasswordPage } from './ChangePasswordPage';
import { LoginPage } from './LoginPage';

interface SessionGateProps {
  appLabel?: string;
  loginIntro: string;
  /** Only this role may use the app; others see `denied` instead. */
  requiredRole?: Role;
  denied?: ReactNode;
  /** The app itself, rendered once someone with access is fully logged in. */
  children: ReactNode;
}

/** Restore wait, login, forced password change or "no access", whichever applies before the app. */
export function SessionGate({
  appLabel,
  loginIntro,
  requiredRole,
  denied,
  children,
}: SessionGateProps) {
  const auth = useAuth();

  if (auth.status === 'loading') return <PageLoading label="Memeriksa sesi Anda" />;
  if (auth.status === 'anonymous') return <LoginPage appLabel={appLabel} intro={loginIntro} />;
  if (auth.status === 'unavailable') {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <StateMessage
          title="Data akun gagal dimuat"
          action={
            <Button icon="refresh" onClick={auth.retry}>
              Coba lagi
            </Button>
          }
        >
          {errorMessages(auth.error)[0]}
        </StateMessage>
      </main>
    );
  }
  if (auth.user.mustChangePassword) {
    return (
      <main className="px-4">
        <ChangePasswordPage forced />
      </main>
    );
  }
  if (requiredRole && auth.user.role !== requiredRole) return denied;
  return children;
}

export function NotFoundPage() {
  return (
    <StateMessage title="Halaman tidak ditemukan">
      Alamat yang dibuka tidak ada di aplikasi ini. Gunakan menu untuk berpindah halaman.
    </StateMessage>
  );
}
