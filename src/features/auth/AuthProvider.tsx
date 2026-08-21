import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { onSessionExpired, refreshAccessToken } from '@/shared/api/client';
import { tokenStore } from '@/shared/api/tokenStore';
import type { UserRole } from '@/shared/types/domain';
import type { User } from '@/shared/types/domain';

import { AuthContext, type AuthContextValue } from './authContext';
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from './api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const queryClient = useQueryClient();
  const restoreStarted = useRef(false);

// Restaura la sesión al cargar la aplicación obteniendo un nuevo token de acceso.
// La referencia evita que este proceso se ejecute más de una vez en StrictMode.
  useEffect(() => {
    if (restoreStarted.current) return;
    restoreStarted.current = true;

    async function restore() {
      if (!tokenStore.getRefreshToken()) {
        setIsRestoring(false);
        return;
      }

      try {
        const access = await refreshAccessToken();
        if (!access) throw new Error('Refresh token rejected');
        setUser(await fetchCurrentUser());
      } catch {
        tokenStore.clear();
        setUser(null);
      } finally {
        setIsRestoring(false);
      }
    }

    void restore();
  }, []);

// Si falla la renovación del token, se cierra la sesión.
  useEffect(() => {
    onSessionExpired(() => {
      setUser(null);
      queryClient.clear();
    });
    return () => onSessionExpired(null);
  }, [queryClient]);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      const response = await loginRequest(credentials);
      setUser(response.user);
// Se limpia la información almacenada del usuario anterior al iniciar una nueva sesión.
      queryClient.clear();
      return response.user;
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const hasRole = (...roles: UserRole[]) => (user ? roles.includes(user.role) : false);

    return {
      user,
      isRestoring,
      isAuthenticated: user !== null,
      login,
      logout,
      hasRole,
      isAdmin: hasRole('ADMIN'),
      canApprove: hasRole('APPROVER', 'ADMIN'),
    };
  }, [user, isRestoring, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
