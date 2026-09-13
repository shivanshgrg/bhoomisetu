import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGES, LANGUAGE_META, uiText, type Language } from '../i18n/translations';

export function LanguagePicker({ triggerClassName = 'nav-link lang-toggle' }: { triggerClassName?: string }) {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function selectLanguage(next: Language) {
    setLanguage(next);
    setIsOpen(false);
  }

  const activeMeta = LANGUAGE_META[language];

  return (
    <div className="language-picker" ref={panelRef}>
      <button
        className={triggerClassName}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t(uiText.nav.languagePickerLabel)}
      >
        <span aria-hidden="true">🌐</span> {activeMeta.endonym}
      </button>
      {isOpen && (
        <ul className="language-picker-panel" role="listbox" aria-label={t(uiText.nav.languagePickerLabel)}>
          {LANGUAGES.map((code) => {
            const meta = LANGUAGE_META[code];
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={code === language}
                  className={code === language ? 'language-picker-item active' : 'language-picker-item'}
                  onClick={() => selectLanguage(code)}
                >
                  <span className="language-picker-endonym">{meta.endonym}</span>
                  <span className="language-picker-label">{meta.label}</span>
                  {meta.coverage === 'citizen' && (
                    <span className="language-picker-coverage">{t(uiText.nav.citizenCoverageNote)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
