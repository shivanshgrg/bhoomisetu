import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, PageContainer, SelectField } from '../components/ui';
import { repository } from '../data';
import {
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

export function LandingPage() {
  const { t } = useLanguage();
  const { session, setSession } = useSession();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [parcels, setParcels] = useState<AcquisitionParcel[]>([]);

  const [pendingRole, setPendingRole] = useState<AppRole | undefined>(session?.role);
  const [stateScope, setStateScope] = useState<StateName | undefined>(session?.stateScope);
  const [districtScope, setDistrictScope] = useState<string | undefined>(session?.districtScope);

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

  const serviceStats = [
    { label: t(uiText.landing.statWorkflowLabel), value: '7' },
    { label: t(uiText.landing.statPortalsLabel), value: '2' },
    { label: t(uiText.landing.statDemoLabel), value: '124/7' },
  ];

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
          Pick a stakeholder role to sign in as. National and state-level roles see the full dashboard;
          district and field roles also choose the state and district they represent.
        </p>
        <div className="role-picker-grid" role="group" aria-label="App role picker">
          {APP_ROLES.map((appRole) => (
            <button
              key={appRole}
              type="button"
              className={
                pendingRole === appRole ? 'role-picker-option role-picker-option-active' : 'role-picker-option'
              }
              aria-pressed={pendingRole === appRole}
              onClick={() => handlePickRole(appRole)}
            >
              {APP_ROLE_LABELS[appRole]}
            </button>
          ))}
        </div>

        {needsState && (
          <SelectField
            label="State"
            value={stateScope ?? ''}
            onChange={(event) => handleStateChange(event.target.value)}
          >
            <option value="">Select a state…</option>
            {stateOptions.map((state) => (
              <option key={state} value={state}>
                {STATE_NAME_LABELS[state]}
              </option>
            ))}
          </SelectField>
        )}

        {needsDistrict && stateScope && (
          <SelectField
            label="District"
            value={districtScope ?? ''}
            onChange={(event) => setDistrictScope(event.target.value || undefined)}
          >
            <option value="">Select a district…</option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </SelectField>
        )}

        {pendingRole && (
          <Button type="button" disabled={!canSignIn} onClick={handleSignIn}>
            Sign in as {APP_ROLE_LABELS[pendingRole]}
          </Button>
        )}

        {session && (
          <p>
            Currently viewing as <Badge tone="info">{APP_ROLE_LABELS[session.role]}</Badge>
            {session.stateScope && <> — {STATE_NAME_LABELS[session.stateScope]}</>}
            {session.districtScope && <> / {session.districtScope}</>}
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
