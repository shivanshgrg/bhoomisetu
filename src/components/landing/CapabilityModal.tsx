import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { uiText } from '../../i18n/translations';

export type CapabilityDetail = {
  index: string;
  title: string;
  detail: string;
};

type CapabilityModalProps = {
  capability: CapabilityDetail | null;
  onClose: () => void;
};

export function CapabilityModal({ capability, onClose }: CapabilityModalProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!capability) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [capability, onClose]);

  const panelMotion = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 14, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 10, scale: 0.98 },
      };

  return (
    <AnimatePresence>
      {capability && (
        <motion.div
          className="bs-capmodal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="bs-capmodal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="capability-modal-title"
            {...panelMotion}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bs-capmodal-bar">
              <span>{capability.index}</span>
              <button
                type="button"
                className="bs-capmodal-close"
                onClick={onClose}
                aria-label={t(uiText.landing.capabilityCloseLabel)}
              >
                ×
              </button>
            </div>
            <div className="bs-capmodal-body">
              <h3 id="capability-modal-title">{capability.title}</h3>
              <p>{capability.detail}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
