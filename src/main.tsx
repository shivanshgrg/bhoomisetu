import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DataSaverProvider } from './i18n/DataSaverContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { SessionProvider } from './i18n/SessionContext';
import { ThemeProvider } from './theme/ThemeContext';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <DataSaverProvider>
            <SessionProvider>
              <App />
            </SessionProvider>
          </DataSaverProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
