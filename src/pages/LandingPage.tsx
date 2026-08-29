import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CapabilityModal } from '../components/landing/CapabilityModal';
import { LandingNav } from '../components/landing/LandingNav';
import { Reveal, RevealLine } from '../components/landing/Reveal';
import { StageWalk, type WalkStage } from '../components/landing/StageWalk';
import { repository } from '../data';
import {
  ACQUISITION_STAGES,
  APP_ROLES,
  APP_ROLE_LABELS,
  STATE_NAME_LABELS,
  type AcquisitionParcel,
  type AcquisitionProject,
  type AppRole,
  type StateName,
} from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { uiText } from '../i18n/translations';
import '../styles/landing.css';
import { useTheme } from '../theme/ThemeContext';

// Where each app role lands by default. This is a demo convenience, not real
// access control — see the APP_ROLES comment in src/domain/constants.ts.
const ROLE_DESTINATION: Record<AppRole, string> = {
  national_admin: '/official/national',
  state_authority: '/official/national',
  district_officer: '/official',
  field_officer: '/official',
  landowner: '/landowner',
};

function requiresStateScope(role: AppRole | undefined): boolean {
  return role === 'state_authority' || role === 'district_officer' || role === 'field_officer';
}

function requiresDistrictScope(role: AppRole | undefined): boolean {
  return role === 'district_officer' || role === 'field_officer';
}

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
  const { session, setSession } = useSession();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [parcels, setParcels] = useState<AcquisitionParcel[]>([]);

  const [pendingRole, setPendingRole] = useState<AppRole | undefined>(session?.role);
  const [stateScope, setStateScope] = useState<StateName | undefined>(session?.stateScope);
  const [districtScope, setDistrictScope] = useState<string | undefined>(session?.districtScope);
  const [activeCapabilityIndex, setActiveCapabilityIndex] = useState<number | null>(null);

  useEffect(() => {
    let isCancelled = false;

    Promise.all([repository.listProjects(), repository.listParcels()])
      .then(([loadedProjects, loadedParcels]) => {
        if (!isCancelled) {
          setProjects(loadedProjects);
          setParcels(loadedParcels);
        }
      })
      .catch(() => {
        // Scope options simply stay empty on failure — the role picker itself
        // still works, it just can't offer state/district selections yet.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const stateOptions = useMemo(() => {
    const states = new Set<StateName>();
    for (const project of projects) {
      states.add(project.state);
    }
    return Array.from(states).sort((a, b) => STATE_NAME_LABELS[a].localeCompare(STATE_NAME_LABELS[b]));
  }, [projects]);

  const districtOptions = useMemo(() => {
    if (!stateScope) {
      return [];
    }
    const districts = new Set<string>();
    for (const parcel of parcels) {
      if (projectById.get(parcel.projectId)?.state === stateScope) {
        districts.add(parcel.district);
      }
    }
    return Array.from(districts).sort();
  }, [parcels, projectById, stateScope]);

  const needsState = requiresStateScope(pendingRole);
  const needsDistrict = requiresDistrictScope(pendingRole);
  const canSignIn =
    pendingRole !== undefined &&
    (!needsState || stateScope !== undefined) &&
    (!needsDistrict || districtScope !== undefined);

  const walkStages: WalkStage[] = ACQUISITION_STAGES.map((stage) => ({
    id: stage.id,
    label: stage.label,
    shortLabel: stage.shortLabel,
    body: t(uiText.landing[STEP_BODY_BY_STAGE_ID[stage.id]]),
  }));

  function handlePickRole(nextRole: AppRole) {
    setPendingRole(nextRole);
    setStateScope(undefined);
    setDistrictScope(undefined);
  }

  function handleStateChange(value: string) {
    setStateScope((value || undefined) as StateName | undefined);
    setDistrictScope(undefined);
  }

  function handleSignIn() {
    if (!pendingRole || !canSignIn) {
      return;
    }
    setSession({
      role: pendingRole,
      stateScope: needsState ? stateScope : undefined,
      districtScope: needsDistrict ? districtScope : undefined,
    });
    navigate(ROLE_DESTINATION[pendingRole]);
  }

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
                <a className="bs-btn bs-btn-amber" href="#sign-in">
                  <span>{t(uiText.landing.heroCtaPrimary)}</span>
                  <span className="bs-btn-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
                <a className="bs-btn bs-btn-outline" href="#portals">
                  <span>{t(uiText.landing.heroCtaSecondary)}</span>
                  <span className="bs-btn-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              </div>
            </motion.div>
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

        <section className="bs-section" id="sign-in">
          <div className="bs-shell">
            <div className="bs-panel">
              <div className="bs-panel-bar">
                <h2>I am viewing as…</h2>
                <span>Prototype convenience — not real security</span>
              </div>
              <div className="bs-panel-body">
                <p>
                  Pick a stakeholder role to sign in as. National and state-level roles see the full dashboard;
                  district and field roles also choose the state and district they represent.
                </p>

                <div className="bs-role-grid" role="group" aria-label="App role picker">
                  {APP_ROLES.map((appRole) => (
                    <button
                      key={appRole}
                      type="button"
                      className={
                        pendingRole === appRole ? 'bs-role-option bs-role-option-active' : 'bs-role-option'
                      }
                      aria-pressed={pendingRole === appRole}
                      onClick={() => handlePickRole(appRole)}
                    >
                      <span>{APP_ROLE_LABELS[appRole]}</span>
                    </button>
                  ))}
                </div>

                {(needsState || (needsDistrict && stateScope)) && (
                  <div className="bs-field-grid">
                    {needsState && (
                      <label className="bs-field" htmlFor="landing-state-scope">
                        <span>State</span>
                        <select
                          id="landing-state-scope"
                          value={stateScope ?? ''}
                          onChange={(event) => handleStateChange(event.target.value)}
                        >
                          <option value="">Select a state…</option>
                          {stateOptions.map((state) => (
                            <option key={state} value={state}>
                              {STATE_NAME_LABELS[state]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {needsDistrict && stateScope && (
                      <label className="bs-field" htmlFor="landing-district-scope">
                        <span>District</span>
                        <select
                          id="landing-district-scope"
                          value={districtScope ?? ''}
                          onChange={(event) => setDistrictScope(event.target.value || undefined)}
                        >
                          <option value="">Select a district…</option>
                          {districtOptions.map((district) => (
                            <option key={district} value={district}>
                              {district}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                )}

                <div className="bs-panel-foot">
                  {pendingRole && (
                    <button
                      type="button"
                      className="bs-btn bs-btn-amber"
                      disabled={!canSignIn}
                      onClick={handleSignIn}
                    >
                      <span>Sign in as {APP_ROLE_LABELS[pendingRole]}</span>
                      <span className="bs-btn-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </button>
                  )}

                  {session && (
                    <p className="bs-session-note">
                      Currently viewing as <span className="bs-session-badge">{APP_ROLE_LABELS[session.role]}</span>
                      {session.stateScope && <> — {STATE_NAME_LABELS[session.stateScope]}</>}
                      {session.districtScope && <> / {session.districtScope}</>}
                    </p>
                  )}
                </div>
              </div>
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
