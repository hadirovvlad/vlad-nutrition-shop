import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountApi, authApi } from '@/services';
import { setUnauthorizedHandler } from '@/services/api';
import { useFavoritesStore } from './favorites';
import { toast } from './toast';
import type { Role, User } from '@/types';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: Role | null;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const syncFavorites = useFavoritesStore((state) => state.sync);
  const resetFavorites = useFavoritesStore((state) => state.reset);

  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    staleTime: 60_000,
    retry: false,
  });

  const user = data?.user ?? null;

  /**
   * A 401 from any protected endpoint means the session is gone. Drop it so the
   * route guards send the visitor to the login page, instead of leaving an
   * error state on every screen of the account or panel.
   */
  useEffect(() => {
    setUnauthorizedHandler(() => {
      const hadSession = Boolean(
        queryClient.getQueryData<{ user: User | null }>(['auth', 'me'])?.user,
      );
      if (!hadSession) return;

      // Write the empty session first: queryClient.clear() would destroy the
      // cache entry this provider's observer is bound to, and the follow-up
      // write would land on a fresh entry nobody is watching — leaving the UI
      // signed in. Personal data is dropped separately, keeping 'auth' intact.
      queryClient.setQueryData(['auth', 'me'], { user: null });
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'auth',
      });
      resetFavorites();
      toast.info('Сесія завершилася', 'Увійдіть, будь ласка, ще раз.');
    });

    return () => setUnauthorizedHandler(null);
  }, [queryClient, resetFavorites]);

  /** After any successful sign-in: adopt the session and merge favourites. */
  const adopt = useCallback(
    async (nextUser: User) => {
      queryClient.setQueryData(['auth', 'me'], { user: nextUser });
      if (nextUser.role === 'CLIENT') {
        const favorites = await accountApi.favorites().catch(() => null);
        if (favorites) await syncFavorites(favorites.ids);
      }
      await queryClient.invalidateQueries({ queryKey: ['account'] });
    },
    [queryClient, syncFavorites],
  );

  const loginMutation = useMutation({
    mutationFn: (input: { email: string; password: string }) => authApi.login(input),
  });

  const registerMutation = useMutation({
    mutationFn: (input: { name: string; email: string; phone?: string; password: string }) =>
      authApi.register(input),
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ email, password });
      await adopt(result.user);
      return result.user;
    },
    [adopt, loginMutation],
  );

  const register = useCallback(
    async (input: { name: string; email: string; phone?: string; password: string }) => {
      const result = await registerMutation.mutateAsync(input);
      await adopt(result.user);
      return result.user;
    },
    [adopt, registerMutation],
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    resetFavorites();
    queryClient.setQueryData(['auth', 'me'], { user: null });
    // Drop every cached response so no personal data survives the sign-out.
    queryClient.clear();
  }, [queryClient, resetFavorites]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      role: user?.role ?? null,
      isStaff: user?.role === 'ADMIN' || user?.role === 'MANAGER',
      login,
      register,
      logout,
      refresh: () => void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
    }),
    [user, isLoading, login, register, logout, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
