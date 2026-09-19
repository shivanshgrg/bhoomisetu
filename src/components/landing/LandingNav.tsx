import { motion, useScroll, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LanguagePicker } from '../LanguagePicker';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';

const SECTION_LINKS = [
  { href: '#about', label: { en: 'About', hi: 'परिचय' } },
  { href: '#journey', label: { en: 'Process', hi: 'प्रक्रिया' } },
  { href: '#services', label: { en: 'Services', hi: 'सेवाएं' } },
  { href: '#faqs', label: { en: 'FAQs', hi: 'सामान्य प्रश्न' } },
];

export function LandingNav() {
  const { language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  return (
    <header className="bs-nav">
      <div className="bs-nav-inner">
        <a className="bs-nav-wordmark" href="#top" aria-label="BhoomiSetu home">
          <img src="/icons/icon.svg" alt="" aria-hidden="true" />
          <span>
            BhoomiSetu
            <small>{language === 'hi' ? 'भूमि अधिग्रहण और पुनर्वास पोर्टल' : 'Land Acquisition & Rehabilitation Portal'}</small>
          </span>
        </a>
        <nav className="bs-nav-links" aria-label="Section navigation">
          {SECTION_LINKS.map((link) => (
            <a key={link.href} className="bs-nav-link" href={link.href}>
              {language === 'hi' ? link.label.hi : link.label.en}
            </a>
          ))}
        </nav>
        <div className="bs-nav-actions">
          <LanguagePicker triggerClassName="bs-nav-icon-btn" />
          <button
            type="button"
            className="bs-nav-icon-btn"
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <Link className="bs-btn bs-btn-amber bs-nav-cta" to="/auth">
            <span>{language === 'hi' ? 'साइन इन' : 'Sign in'}</span>
            <span className="bs-btn-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        </div>
      </div>
      <motion.div className="bs-nav-progress" style={{ scaleX: progress }} aria-hidden="true" />
    </header>
  );
}
