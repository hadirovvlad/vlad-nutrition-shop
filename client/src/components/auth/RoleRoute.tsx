import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROLE_HOME } from '@/lib/constants';
import { useAuth } from '@/store/auth';
import { PageLoader } from '@/components/ui/feedback';
import type { Role } from '@/types';

/**
 * Client-side route guard. It keeps people out of panels they have no business
 * in, but it is only a convenience: every endpoint re-checks the role on the
 * server, so a hand-typed URL cannot reach protected data either way.
 */
export function RoleRoute({ allow }: { allow: Role[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!user) {
    // Remember where they were heading so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  return <Outlet />;
}

/** Redirects an already signed-in visitor away from login/register. */
export function GuestOnlyRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  return <Outlet />;
}
