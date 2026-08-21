import { createContext } from 'react';

import type { User, UserRole } from '@/shared/types/domain';

export type AuthContextValue = {
  user: User | null;
  isRestoring: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: boolean;
  canApprove: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
