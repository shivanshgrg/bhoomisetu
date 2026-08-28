import { Link, useNavigate } from 'react-router-dom';
import { Badge, Card, PageContainer } from '../components/ui';
import { STAKEHOLDER_ROLES, STAKEHOLDER_ROLE_LABELS, type StakeholderRole } from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { useRole } from '../i18n/RoleContext';
import { uiText } from '../i18n/translations';

// Where each stakeholder role lands by default. This is a demo convenience,
// not real access control — see the STAKEHOLDER_ROLES comment in
// src/domain/constants.ts.
const ROLE_DESTINATION: Record<StakeholderRole, string> = {
  central_state_viewer: '/official/national',
  district_officer: '/official',
  project_agency: '/official',
  landowner: '/landowner',
};

export function LandingPage() {
  const { t } = useLanguage();
  const { role, setRole } = useRole();
  const navigate = useNavigate();

  const serviceStats = [
    { label: t(uiText.landing.statWorkflowLabel), value: '7' },
    { label: t(uiText.landing.statPortalsLabel), value: '2' },
    { label: t(uiText.landing.statDemoLabel), value: '124/7' },
  ];

  function handlePickRole(nextRole: StakeholderRole) {
    setRole(nextRole);
    navigate(ROLE_DESTINATION[nextRole]);
  }

  return (
    <PageContainer>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div>
          <Badge tone="info">{t(uiText.landing.badge)}</Badge>
          <h1 id="landing-title">BhoomiSetu</h1>
          <p>{t(uiText.landing.description)}</p>
        </div>
        <div className="hero-actions" aria-label="Choose portal">
          <Link className="role-tile role-official" to="/official">
            <span>{t(uiText.landing.officialTitle)}</span>
            <strong>{t(uiText.landing.officialDescription)}</strong>
          </Link>
          <Link className="role-tile role-landowner" to="/landowner">
            <span>{t(uiText.landing.landownerTitle)}</span>
            <strong>{t(uiText.landing.landownerDescription)}</strong>
          </Link>
        </div>
      </section>

      <section className="stat-band" aria-label="Prototype scope">
        {serviceStats.map((stat) => (
          <div key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <Card eyebrow="Prototype convenience — not real security" title="I am viewing as…">
        <p>
          Pick a stakeholder role to jump straight to the view it typically uses. This only changes
          which page you land on and a label shown in the header — it does not restrict data access.
        </p>
        <div className="role-picker-grid" role="group" aria-label="Stakeholder role picker">
          {STAKEHOLDER_ROLES.map((stakeholderRole) => (
            <button
              key={stakeholderRole}
              type="button"
              className={
                role === stakeholderRole ? 'role-picker-option role-picker-option-active' : 'role-picker-option'
              }
              aria-pressed={role === stakeholderRole}
              onClick={() => handlePickRole(stakeholderRole)}
            >
              {STAKEHOLDER_ROLE_LABELS[stakeholderRole]}
            </button>
          ))}
        </div>
        {role && (
          <p>
            Currently viewing as <Badge tone="info">{STAKEHOLDER_ROLE_LABELS[role]}</Badge>
          </p>
        )}
      </Card>

      <div className="landing-grid">
        <Card eyebrow="Foundation" title={t(uiText.landing.foundationTitle)}>
          <p>{t(uiText.landing.foundationBody)}</p>
        </Card>
        <Card eyebrow="Next data path" title={t(uiText.landing.nextTitle)}>
          <p>{t(uiText.landing.nextBody)}</p>
        </Card>
      </div>
    </PageContainer>
  );
}
