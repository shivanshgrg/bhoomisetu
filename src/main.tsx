import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { DataSaverProvider } from './i18n/DataSaverContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { RoleProvider } from './i18n/RoleContext';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <DataSaverProvider>
          <RoleProvider>
            <App />
          </RoleProvider>
        </DataSaverProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
