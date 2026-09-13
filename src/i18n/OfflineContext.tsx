import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { drainOfflineQueue, getPendingActions, subscribeOfflineQueue, type PendingAction } from '../data';

type OfflineContextValue = {
  isOnline: boolean;
  pendingActions: PendingAction[];
  isSyncing: boolean;
  syncNow: () => void;
  pendingCountForParcel: (parcelId: string) => number;
};

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  function refreshPending() {
    getPendingActions()
      .then(setPendingActions)
      .catch(() => {});
  }

  function syncNow() {
    setIsSyncing(true);
    drainOfflineQueue()
      .then(refreshPending)
      .finally(() => setIsSyncing(false));
  }

  useEffect(() => {
    refreshPending();
    return subscribeOfflineQueue(refreshPending);
  }, []);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      syncNow();
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<OfflineContextValue>(
    () => ({
      isOnline,
      pendingActions,
      isSyncing,
      syncNow,
      pendingCountForParcel: (parcelId: string) => pendingActions.filter((action) => action.parcelId === parcelId).length,
    }),
    [isOnline, pendingActions, isSyncing],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
