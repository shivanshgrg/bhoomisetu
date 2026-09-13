import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DataSaverProvider } from './i18n/DataSaverContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { OfflineProvider } from './i18n/OfflineContext';
import { SessionProvider } from './i18n/SessionContext';
import { ThemeProvider } from './theme/ThemeContext';
import './styles.css';

if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('coverage')) {
  import('./i18n/coverageReport').then(({ logTranslationCoverage }) => logTranslationCoverage());
}

// Registered only in production builds — the dev server serves unbundled
// modules, and a cache-first service worker would fight Vite's own HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <DataSaverProvider>
            <OfflineProvider>
              <SessionProvider>
                <App />
              </SessionProvider>
            </OfflineProvider>
          </DataSaverProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
