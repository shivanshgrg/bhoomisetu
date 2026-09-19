import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CapabilityModal } from '../components/landing/CapabilityModal';
import { LandingNav } from '../components/landing/LandingNav';
import { Reveal, RevealLine } from '../components/landing/Reveal';
import { StageWalk, type WalkStage } from '../components/landing/StageWalk';
import { ACQUISITION_STAGES } from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { stageLabels, stageShortLabels, uiText } from '../i18n/translations';
import '../styles/landing.css';
import { useTheme } from '../theme/ThemeContext';

const STEP_BODY_BY_STAGE_ID: Record<string, keyof typeof uiText.landing> = {
  notification: 'stepNotificationBody',
  survey: 'stepSurveyBody',
  objection_review: 'stepObjectionBody',
  valuation: 'stepValuationBody',
  compensation_approval: 'stepApprovalBody',
  award: 'stepAwardBody',
  possession: 'stepPossessionBody',
};

const CAPABILITIES = [
  { titleKey: 'capabilityAccessTitle', bodyKey: 'capabilityAccessBody', detailKey: 'capabilityAccessDetail' },
  {
    titleKey: 'capabilityVerificationTitle',
    bodyKey: 'capabilityVerificationBody',
    detailKey: 'capabilityVerificationDetail',
  },
  { titleKey: 'capabilityRiskTitle', bodyKey: 'capabilityRiskBody', detailKey: 'capabilityRiskDetail' },
  { titleKey: 'capabilityReportsTitle', bodyKey: 'capabilityReportsBody', detailKey: 'capabilityReportsDetail' },
  { titleKey: 'capabilityAuditTitle', bodyKey: 'capabilityAuditBody', detailKey: 'capabilityAuditDetail' },
  {
    titleKey: 'capabilityTimelineTitle',
    bodyKey: 'capabilityTimelineBody',
    detailKey: 'capabilityTimelineDetail',
  },
] as const satisfies ReadonlyArray<{
  titleKey: keyof typeof uiText.landing;
  bodyKey: keyof typeof uiText.landing;
  detailKey: keyof typeof uiText.landing;
}>;

export function LandingPage() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  const [activeCapabilityIndex, setActiveCapabilityIndex] = useState<number | null>(null);

  const walkStages: WalkStage[] = ACQUISITION_STAGES.map((stage) => ({
    id: stage.id,
    label: t(stageLabels[stage.id]),
    shortLabel: t(stageShortLabels[stage.id]),
    body: t(uiText.landing[STEP_BODY_BY_STAGE_ID[stage.id]]),
  }));

  const heroRise = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <div className="bs-landing" data-theme={theme} id="top">
      <LandingNav />

      <main>
        <section className="bs-section bs-hero" aria-labelledby="landing-title">
          <div className="bs-shell bs-hero-grid">
            <div className="bs-hero-lead">
              <motion.span
                className="bs-eyebrow"
                {...heroRise}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              >
                {t(uiText.landing.badge)}
              </motion.span>
              <h1 id="landing-title">
                <RevealLine immediate index={0}>
                  {t(uiText.landing.headlineMain)}
                </RevealLine>{' '}
                <RevealLine immediate index={1}>
                  <span className="bs-muted">{t(uiText.landing.headlineMuted)}</span>
                </RevealLine>
              </h1>
            </div>

            <motion.div
              className="bs-hero-aside"
              {...heroRise}
              transition={{ duration: 0.5, delay: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <p>{t(uiText.landing.description)}</p>
              <div className="bs-hero-actions">
                <Link className="bs-btn bs-btn-amber" to="/auth">
                  <span>{t(uiText.landing.heroCtaPrimary)}</span>
                  <span className="bs-btn-arrow" aria-hidden="true">
                    ↗
                  </span>
                </Link>
                <a className="bs-btn bs-btn-outline" href="#portals">
                  <span>{t(uiText.landing.heroCtaSecondary)}</span>
                  <span className="bs-btn-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              </div>
            </motion.div>
            <div className="bs-india-visual" aria-label="India land-acquisition coordination visual">
              <svg viewBox="0 0 420 500" role="img" aria-hidden="true">
                <path d="M181 25l58 18 19 39 49 17-4 40 32 31-35 36-10 57-35 39-22 72-38 86-34-85-42-39-26-54-37-21 18-49-16-46 35-48 15-60 38-28z" />
                <path className="bs-india-route" d="M153 107c34 45 51 94 40 148-9 46 9 96 42 151" />
                <circle cx="153" cy="107" r="8" /><circle cx="193" cy="255" r="8" /><circle cx="235" cy="406" r="8" />
              </svg>
              <div className="bs-india-caption"><strong>One connected acquisition system</strong><span>From national oversight to parcel action</span></div>
              <div className="bs-india-signal"><span className="bs-signal-dot" /> <span>Coordinated · transparent · accountable</span></div>
            </div>
            <div className="bs-hero-ribbon" aria-label="Platform capabilities">
              <div><span>01</span><strong>Role-aware access</strong><small>Every user sees the right level of detail.</small></div>
              <div><span>02</span><strong>Seven-stage workflow</strong><small>Clear gates and documented next actions.</small></div>
              <div><span>03</span><strong>Citizen visibility</strong><small>Landowners can follow their own case.</small></div>
            </div>
          </div>
        </section>

        <section className="bs-section" id="portals" aria-label="Choose portal">
          <div className="bs-shell">
            <div className="bs-section-head">
              <div>
                <span className="bs-eyebrow">{t(uiText.landing.portalsEyebrow)}</span>
                <h2>
                  <RevealLine>{t(uiText.landing.portalsHeading)}</RevealLine>
                </h2>
              </div>
              <p>{t(uiText.landing.portalsIntro)}</p>
            </div>

            <div className="bs-portals">
              {[
                {
                  to: '/official',
                  index: '01',
                  title: t(uiText.landing.officialTitle),
                  body: t(uiText.landing.officialDescription),
                },
                {
                  to: '/landowner',
                  index: '02',
                  title: t(uiText.landing.landownerTitle),
                  body: t(uiText.landing.landownerDescription),
                },
              ].map((portal, index) => (
                <Reveal className="bs-portal-cell" index={index} key={portal.to}>
                  <Link className="bs-portal" to={portal.to}>
                    <span className="bs-portal-index">{portal.index}</span>
                    <div className="bs-portal-text">
                      <h3>{portal.title}</h3>
                      <p>{portal.body}</p>
                    </div>
                    <span className="bs-portal-link">
                      {t(uiText.landing.portalLinkLabel)}
                      <span className="bs-btn-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="bs-section bs-journey" id="journey">
          <div className="bs-shell">
            <div className="bs-section-head">
              <div>
                <span className="bs-eyebrow">{t(uiText.landing.howItWorksEyebrow)}</span>
                <h2>
                  <RevealLine>{t(uiText.landing.howItWorksHeading)}</RevealLine>
                </h2>
              </div>
              <p>{t(uiText.landing.howItWorksIntro)}</p>
            </div>
          </div>
          <StageWalk stages={walkStages} />
        </section>

        <section className="bs-section" id="capabilities">
          <div className="bs-shell">
            <div className="bs-section-head">
              <div>
                <span className="bs-eyebrow">{t(uiText.landing.capabilitiesEyebrow)}</span>
                <h2>
                  <RevealLine>{t(uiText.landing.capabilitiesHeading)}</RevealLine>
                </h2>
              </div>
              <p>{t(uiText.landing.capabilitiesIntro)}</p>
            </div>

            <div className="bs-capabilities">
              {CAPABILITIES.map((capability, index) => (
                <Reveal className="bs-capability-cell" index={index} key={capability.titleKey}>
                  <button
                    type="button"
                    className="bs-capability"
                    aria-haspopup="dialog"
                    onClick={() => setActiveCapabilityIndex(index)}
                  >
                    <span className="bs-capability-index">{String(index + 1).padStart(2, '0')}</span>
                    <h3>{t(uiText.landing[capability.titleKey])}</h3>
                    <p>{t(uiText.landing[capability.bodyKey])}</p>
                    <span className="bs-capability-expand" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="bs-footer">
        <div className="bs-shell bs-footer-inner">
          <span className="bs-footer-wordmark">BhoomiSetu</span>
          <span className="bs-footer-meta">{t(uiText.landing.footerTagline)}</span>
        </div>
      </footer>

      <CapabilityModal
        capability={
          activeCapabilityIndex === null
            ? null
            : {
                index: String(activeCapabilityIndex + 1).padStart(2, '0'),
                title: t(uiText.landing[CAPABILITIES[activeCapabilityIndex].titleKey]),
                detail: t(uiText.landing[CAPABILITIES[activeCapabilityIndex].detailKey]),
              }
        }
        onClose={() => setActiveCapabilityIndex(null)}
      />
    </div>
  );
}
