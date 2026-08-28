import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../i18n/SessionContext';
import type { AppRole } from '../domain';

type RequireRoleProps = {
  allowedRoles: AppRole[];
  children: ReactNode;
};

// Route guard for the official-side portal. No session at all sends the
// visitor back to the landing page's sign-in picker; a signed-in session
// whose role isn't allowed for this particular route shows Access Restricted
// instead of the real page/data. Landowner routes never use this component —
// that portal is intentionally anonymous/login-free.
export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { session } = useSession();

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to="/official/access-restricted" replace />;
  }

  return <>{children}</>;
}
