import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../lib/api';
import type { AuthUser, ClientSession, Employee } from '../lib/types';

type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  /** Logged in, but the profile could not be loaded (a backend service is down). */
  | { status: 'unavailable'; error: unknown }
  | { status: 'authenticated'; user: AuthUser; employee: Employee };

interface AuthActions {
  login: (identifier: string, password: string, rememberDevice: boolean) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Tries again after `unavailable`. */
  retry: () => void;
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/** For screens that only render when someone is logged in. */
export function useCurrentUser() {
  const auth = useAuth();
  if (auth.status !== 'authenticated') throw new Error('No user is logged in');
  return { user: auth.user, employee: auth.employee };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const enter = useCallback(async (session: ClientSession) => {
    try {
      const { employee } = await api.get<{ employee: Employee }>('/auth/me');
      setState({ status: 'authenticated', user: session.user, employee });
    } catch (error) {
      setState({ status: 'unavailable', error });
    }
  }, []);

  const restore = useCallback(async () => {
    setState({ status: 'loading' });
    const session = await api.restoreSession();
    if (session) await enter(session);
    else setState({ status: 'anonymous' });
  }, [enter]);

  useEffect(() => {
    void restore();
    // Another request found the session revoked (logout elsewhere, deactivation, expiry).
    api.onSessionLost(() => {
      queryClient.clear();
      setState({ status: 'anonymous' });
    });
  }, [restore, queryClient]);

  const actions = useMemo<AuthActions>(
    () => ({
      login: async (identifier, password, rememberDevice) => {
        await enter(await api.login(identifier, password, rememberDevice));
      },
      logout: async () => {
        await api.logout();
        // Cached data belongs to the account that just left.
        queryClient.clear();
        setState({ status: 'anonymous' });
      },
      changePassword: async (currentPassword, newPassword) => {
        const { accessToken } = await api.post<{ accessToken: string }>('/auth/change-password', {
          currentPassword,
          newPassword,
        });
        api.setAccessToken(accessToken);
        setState((current) =>
          current.status === 'authenticated'
            ? { ...current, user: { ...current.user, mustChangePassword: false } }
            : current,
        );
      },
      retry: () => void restore(),
    }),
    [enter, restore, queryClient],
  );

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
