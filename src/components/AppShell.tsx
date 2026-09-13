import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LandownerChatbot } from './LandownerChatbot';
import { LanguagePicker } from './LanguagePicker';
import { NotificationCenter } from './NotificationCenter';
import { useDataSaver } from '../i18n/DataSaverContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useOffline } from '../i18n/OfflineContext';
import { useSession } from '../i18n/SessionContext';
import { uiText } from '../i18n/translations';
import { useTheme } from '../theme/ThemeContext';

function userInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AppShell() {
  const { t } = useLanguage();
  const { isDataSaverOn, toggleDataSaver } = useDataSaver();
  const { theme, toggleTheme } = useTheme();
  const { isOnline, pendingActions, isSyncing, syncNow } = useOffline();
  const { session, signOut } = useSession();
  const navigate = useNavigate();

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
          <LanguagePicker />
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
          {pendingActions.length > 0 && (
            <button className="nav-link lang-toggle offline-sync-chip" type="button" onClick={syncNow} disabled={isSyncing}>
              <span aria-hidden="true">⟳</span> {pendingActions.length} {t(uiText.offline.pendingBadgePrefix)}
              {!isSyncing && ` · ${t(uiText.offline.syncNowButton)}`}
              {isSyncing && ` · ${t(uiText.offline.syncingButton)}`}
            </button>
          )}
          <NotificationCenter />
          {session?.user && (
            <div className="user-chip">
              <span className="user-chip-avatar" aria-hidden="true">
                {userInitials(session.user.name)}
              </span>
              <span className="user-chip-name">{session.user.name}</span>
              <button
                type="button"
                className="user-chip-signout"
                onClick={() => {
                  signOut();
                  navigate('/auth');
                }}
              >
                {t(uiText.user.signOut)}
              </button>
            </div>
          )}
        </nav>
      </header>
      {!isOnline && <div className="offline-banner">{t(uiText.offline.bannerOffline)}</div>}
      <main className="page-frame">
        <Outlet />
      </main>
      <LandownerChatbot />
    </div>
  );
}
