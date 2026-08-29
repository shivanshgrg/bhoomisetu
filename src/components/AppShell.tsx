import { NavLink, Outlet } from 'react-router-dom';
import { NotificationCenter } from './NotificationCenter';
import { useDataSaver } from '../i18n/DataSaverContext';
import { useLanguage } from '../i18n/LanguageContext';
import { uiText } from '../i18n/translations';
import { useTheme } from '../theme/ThemeContext';

export function AppShell() {
  const { language, t, toggleLanguage } = useLanguage();
  const { isDataSaverOn, toggleDataSaver } = useDataSaver();
  const { theme, toggleTheme } = useTheme();

  const navLinks = [
    { to: '/', label: t(uiText.nav.home), end: true },
    { to: '/official', label: t(uiText.nav.official) },
    { to: '/landowner', label: t(uiText.nav.landowner) },
  ];

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="BhoomiSetu home">
          <span className="brand-mark" aria-hidden="true">
            BS
          </span>
          <span>
            <span className="brand-title">BhoomiSetu</span>
            <span className="brand-subtitle">Land Acquisition Portal</span>
          </span>
        </a>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <NavLink
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              end={link.end}
              key={link.to}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
          <button
            className="nav-link lang-toggle"
            type="button"
            onClick={toggleLanguage}
            aria-label={language === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}
          >
            <span aria-hidden="true">🌐</span> {t(uiText.nav.languageToggleLabel)}
          </button>
          <button
            className="nav-link lang-toggle"
            type="button"
            onClick={toggleDataSaver}
            aria-pressed={isDataSaverOn}
          >
            <span aria-hidden="true">📶</span>{' '}
            {isDataSaverOn ? t(uiText.nav.dataSaverOnLabel) : t(uiText.nav.dataSaverOffLabel)}
          </button>
          <button
            className="nav-link lang-toggle theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
          <NotificationCenter />
        </nav>
      </header>
      <main className="page-frame">
        <Outlet />
      </main>
    </div>
  );
}
