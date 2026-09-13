import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANGUAGES, type Language, type TranslationEntry } from './translations';

const LANGUAGE_STORAGE_KEY = 'bhoomisetu-language';

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'en';
  }

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return (LANGUAGES as readonly string[]).includes(stored ?? '') ? (stored as Language) : 'en';
  } catch {
    return 'en';
  }
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (entry: TranslationEntry) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // Ignore storage failures (private browsing, disabled storage) — the
      // toggle still works for the current session via component state.
    }
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (entry: TranslationEntry) => (language === 'en' ? entry.en : entry[language] ?? entry.en),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
