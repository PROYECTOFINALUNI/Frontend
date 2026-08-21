import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { LoadingState } from '@/shared/components/States';
import { useAuth } from '@/features/auth/useAuth';
import type { UserRole } from '@/shared/types/domain';

/**
 * Route guard. This is a usability measure only: the API enforces every
 * permission independently, so hiding a route never substitutes for the
 * server-side check.
 */
export function RequireAuth({ roles }: { roles?: UserRole[] }) {
  const { isAuthenticated, isRestoring, user } = useAuth();
  const location = useLocation();

  if (isRestoring) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingState label="Restoring your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
