import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../i18n/SessionContext';
import type { AppRole } from '../domain';

type RequireRoleProps = {
  allowedRoles: AppRole[];
  children: ReactNode;
};

// Route guard for both the official-side portal and (Step 62 Part A) the
// landowner portal. No session at all sends the visitor to /auth; a
// signed-in session whose role isn't allowed for this particular route shows
// Access Restricted instead of the real page/data — e.g. an officer session
// hitting a landowner route, or vice versa.
export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { session } = useSession();

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to="/official/access-restricted" replace />;
  }

  return <>{children}</>;
}
