import { motion, useScroll, useSpring } from 'framer-motion';
import { useLanguage } from '../../i18n/LanguageContext';
import { uiText } from '../../i18n/translations';
import { useTheme } from '../../theme/ThemeContext';

const SECTION_LINKS = [
  { href: '#portals', label: { en: 'Portals', hi: 'पोर्टल' } },
  { href: '#journey', label: { en: 'Process', hi: 'प्रक्रिया' } },
  { href: '#capabilities', label: { en: 'Capabilities', hi: 'क्षमताएं' } },
];

export function LandingNav() {
  const { language, t, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  return (
    <header className="bs-nav">
      <div className="bs-nav-inner">
        <a className="bs-nav-wordmark" href="#top" aria-label="BhoomiSetu home">
          BhoomiSetu
        </a>
        <nav className="bs-nav-links" aria-label="Section navigation">
          {SECTION_LINKS.map((link) => (
            <a key={link.href} className="bs-nav-link" href={link.href}>
              {link.label[language]}
            </a>
          ))}
        </nav>
        <div className="bs-nav-actions">
          <button
            type="button"
            className="bs-nav-icon-btn"
            onClick={toggleLanguage}
            aria-label={language === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}
          >
            {t(uiText.nav.languageToggleLabel)}
          </button>
          <button
            type="button"
            className="bs-nav-icon-btn"
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <a className="bs-btn bs-btn-amber bs-nav-cta" href="#sign-in">
            <span>{language === 'en' ? 'Sign in' : 'साइन इन'}</span>
            <span className="bs-btn-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
        </div>
      </div>
      <motion.div className="bs-nav-progress" style={{ scaleX: progress }} aria-hidden="true" />
    </header>
  );
}
