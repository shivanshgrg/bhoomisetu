import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { STAKEHOLDER_ROLES, type StakeholderRole } from '../domain';

const ROLE_STORAGE_KEY = 'bhoomisetu-role';

function readStoredRole(): StakeholderRole | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
    return (STAKEHOLDER_ROLES as readonly string[]).includes(stored ?? '')
      ? (stored as StakeholderRole)
      : undefined;
  } catch {
    return undefined;
  }
}

type RoleContextValue = {
  role: StakeholderRole | undefined;
  setRole: (role: StakeholderRole) => void;
  clearRole: () => void;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<StakeholderRole | undefined>(readStoredRole);

  const value = useMemo<RoleContextValue>(
    () => ({
      role,
      setRole: (nextRole: StakeholderRole) => {
        setRoleState(nextRole);
        try {
          window.localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
        } catch {
          // Ignore storage failures (private browsing, disabled storage) — the
          // selection still works for the current session via component state.
        }
      },
      clearRole: () => {
        setRoleState(undefined);
        try {
          window.localStorage.removeItem(ROLE_STORAGE_KEY);
        } catch {
          // Ignore storage failures, same as above.
        }
      },
    }),
    [role],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
