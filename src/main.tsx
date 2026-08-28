import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DataSaverProvider } from './i18n/DataSaverContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { SessionProvider } from './i18n/SessionContext';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <DataSaverProvider>
          <SessionProvider>
            <App />
          </SessionProvider>
        </DataSaverProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
