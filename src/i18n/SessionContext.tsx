import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { APP_ROLES, STATE_NAME_LABELS, type AppRole, type StateName } from '../domain';

const SESSION_STORAGE_KEY = 'bhoomisetu-session';

// Step 24: extends the Step 17/23 role picker with an optional state/district
// scope, captured here but not yet enforced anywhere (enforcement is Step 26).
export type Session = {
  role: AppRole;
  stateScope?: StateName;
  districtScope?: string;
};

function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}

function isStateName(value: unknown): value is StateName {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(STATE_NAME_LABELS, value);
}

function readStoredSession(): Session | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      return undefined;
    }

    // JSON.parse throws on the old bhoomisetu-role key's bare string value
    // (e.g. `district_officer`, invalid JSON), which the catch below turns
    // into `undefined` — that is the entire migration story for that key.
    const parsed = JSON.parse(stored) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return undefined;
    }

    const candidate = parsed as Record<string, unknown>;
    if (!isAppRole(candidate.role)) {
      return undefined;
    }

    const session: Session = { role: candidate.role };
    if (isStateName(candidate.stateScope)) {
      session.stateScope = candidate.stateScope;
    }
    if (typeof candidate.districtScope === 'string' && candidate.districtScope.length > 0) {
      session.districtScope = candidate.districtScope;
    }
    return session;
  } catch {
    return undefined;
  }
}

type SessionContextValue = {
  session: Session | undefined;
  setSession: (session: Session) => void;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | undefined>(readStoredSession);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      setSession: (nextSession: Session) => {
        setSessionState(nextSession);
        try {
          window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
        } catch {
          // Ignore storage failures (private browsing, disabled storage) — the
          // selection still works for the current session via component state.
        }
      },
      clearSession: () => {
        setSessionState(undefined);
        try {
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
        } catch {
          // Ignore storage failures, same as above.
        }
      },
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
