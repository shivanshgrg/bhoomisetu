import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

const DATA_SAVER_STORAGE_KEY = 'bhoomisetu-data-saver';

function readStoredDataSaver(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(DATA_SAVER_STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

type DataSaverContextValue = {
  isDataSaverOn: boolean;
  toggleDataSaver: () => void;
};

const DataSaverContext = createContext<DataSaverContextValue | undefined>(undefined);

export function DataSaverProvider({ children }: { children: ReactNode }) {
  const [isDataSaverOn, setIsDataSaverOn] = useState<boolean>(readStoredDataSaver);

  const value = useMemo<DataSaverContextValue>(
    () => ({
      isDataSaverOn,
      toggleDataSaver: () => {
        setIsDataSaverOn((current) => {
          const next = !current;
          try {
            window.localStorage.setItem(DATA_SAVER_STORAGE_KEY, next ? 'on' : 'off');
          } catch {
            // Ignore storage failures (private browsing, disabled storage) — the
            // toggle still works for the current session via component state.
          }
          return next;
        });
      },
    }),
    [isDataSaverOn],
  );

  return <DataSaverContext.Provider value={value}>{children}</DataSaverContext.Provider>;
}

export function useDataSaver() {
  const context = useContext(DataSaverContext);
  if (!context) {
    throw new Error('useDataSaver must be used within a DataSaverProvider');
  }
  return context;
}
