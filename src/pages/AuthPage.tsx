import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEMO_CITIZEN_PROFILE,
  DEMO_OFFICER_PROFILE,
  requestOtp,
  verifyOfficerCredentials,
  verifyOtp,
} from '../auth/authRepository';
import { LanguagePicker } from '../components/LanguagePicker';
import { Button, Card } from '../components/ui';
import { repository } from '../data';
import { STATE_NAME_LABELS, type AcquisitionParcel, type AcquisitionProject, type AppRole, type StateName } from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { uiText } from '../i18n/translations';
import { useTheme } from '../theme/ThemeContext';

// Step 62 Part A. Where each signed-in role lands — mirrors the destinations
// the old LandingPage sign-in panel used, minus the roles that page's picker
// exposed but this page's officer tab does not issue (national_admin has no
// DEMO_OFFICERS entry — see src/auth/authRepository.ts).
const ROLE_DESTINATION: Record<AppRole, string> = {
  national_admin: '/official/national',
  state_authority: '/official',
  district_officer: '/official',
  field_officer: '/official',
  landowner: '/landowner',
};

const OTP_RESEND_SECONDS = 60;

function requiresStateScope(role: AppRole | undefined): boolean {
  return role === 'state_authority' || role === 'district_officer' || role === 'field_officer';
}

function requiresDistrictScope(role: AppRole | undefined): boolean {
  return role === 'district_officer' || role === 'field_officer';
}

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(-10);
}

export function AuthPage() {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { signIn } = useSession();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'landowner' | 'officer'>('landowner');

  // Landowner (citizen OTP) tab state.
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [demoOtpCode, setDemoOtpCode] = useState<string | undefined>(undefined);
  const [citizenError, setCitizenError] = useState<string | undefined>(undefined);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Officer (email/password) tab state.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingOfficerRole, setPendingOfficerRole] = useState<AppRole | undefined>(undefined);
  const [pendingOfficerName, setPendingOfficerName] = useState<string | undefined>(undefined);
  const [pendingOfficerEmail, setPendingOfficerEmail] = useState<string | undefined>(undefined);
  const [officerStateScope, setOfficerStateScope] = useState<StateName | undefined>(undefined);
  const [officerDistrictScope, setOfficerDistrictScope] = useState<string | undefined>(undefined);
  const [officerError, setOfficerError] = useState<string | undefined>(undefined);
  const [isSigningInOfficer, setIsSigningInOfficer] = useState(false);

  const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [parcels, setParcels] = useState<AcquisitionParcel[]>([]);

  const resendTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

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
        // State/district options simply stay empty on failure — same
        // graceful degradation the old LandingPage picker used.
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (resendSecondsLeft <= 0) {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = undefined;
      }
      return;
    }
    resendTimerRef.current = setInterval(() => {
      setResendSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = undefined;
      }
    };
  }, [resendSecondsLeft]);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const stateOptions = useMemo(() => {
    const states = new Set<StateName>();
    for (const project of projects) {
      states.add(project.state);
    }
    return Array.from(states).sort((a, b) => STATE_NAME_LABELS[a].localeCompare(STATE_NAME_LABELS[b]));
  }, [projects]);

  const districtOptions = useMemo(() => {
    if (!officerStateScope) {
      return [];
    }
    const districts = new Set<string>();
    for (const parcel of parcels) {
      if (projectById.get(parcel.projectId)?.state === officerStateScope) {
        districts.add(parcel.district);
      }
    }
    return Array.from(districts).sort();
  }, [parcels, projectById, officerStateScope]);

  const needsState = requiresStateScope(pendingOfficerRole);
  const needsDistrict = requiresDistrictScope(pendingOfficerRole);
  const officerCanFinishSignIn =
    pendingOfficerRole !== undefined &&
    (!needsState || officerStateScope !== undefined) &&
    (!needsDistrict || officerDistrictScope !== undefined);

  function resetOfficerScopeStep() {
    setPendingOfficerRole(undefined);
    setPendingOfficerName(undefined);
    setPendingOfficerEmail(undefined);
    setOfficerStateScope(undefined);
    setOfficerDistrictScope(undefined);
  }

  function handleDemoCitizenLogin() {
    signIn(DEMO_CITIZEN_PROFILE, 'landowner');
    navigate('/landowner');
  }

  function handleDemoOfficerLogin() {
    // District Collector, pre-scoped in authRepository.ts to Maharashtra /
    // Pune so this 1-click path never needs a scope picker.
    signIn(DEMO_OFFICER_PROFILE, 'district_officer', 'maharashtra', 'Pune');
    navigate('/official');
  }

  function handleSendOtp(event: React.FormEvent) {
    event.preventDefault();
    setCitizenError(undefined);
    const digits = normalizePhoneDigits(phone);
    if (digits.length !== 10) {
      setCitizenError(t(uiText.auth.errorMissingPhone));
      return;
    }
    requestOtp(`+91${digits}`).then(({ code }) => {
      setOtpSent(true);
      setOtp('');
      setDemoOtpCode(code);
      setResendSecondsLeft(OTP_RESEND_SECONDS);
    });
  }

  function handleResendOtp() {
    if (resendSecondsLeft > 0) {
      return;
    }
    const digits = normalizePhoneDigits(phone);
    requestOtp(`+91${digits}`).then(({ code }) => {
      setOtp('');
      setDemoOtpCode(code);
      setResendSecondsLeft(OTP_RESEND_SECONDS);
    });
  }

  function handleChangeNumber() {
    setOtpSent(false);
    setOtp('');
    setDemoOtpCode(undefined);
    setCitizenError(undefined);
    setResendSecondsLeft(0);
  }

  function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setCitizenError(undefined);
    setIsVerifyingOtp(true);
    const digits = normalizePhoneDigits(phone);
    verifyOtp(`+91${digits}`, otp.trim())
      .then((user) => {
        signIn(user, 'landowner');
        navigate('/landowner');
      })
      .catch(() => {
        setCitizenError(t(uiText.auth.errorInvalidOtp));
      })
      .finally(() => {
        setIsVerifyingOtp(false);
      });
  }

  function handleOfficerCredentials(event: React.FormEvent) {
    event.preventDefault();
    setOfficerError(undefined);
    setIsSigningInOfficer(true);
    verifyOfficerCredentials(email.trim(), password)
      .then(({ user, appRole }) => {
        setPendingOfficerRole(appRole);
        setPendingOfficerName(user.name);
        setPendingOfficerEmail(user.email);
      })
      .catch(() => {
        setOfficerError(t(uiText.auth.errorInvalidCredentials));
      })
      .finally(() => {
        setIsSigningInOfficer(false);
      });
  }

  function handleFinishOfficerSignIn() {
    if (!pendingOfficerRole || !pendingOfficerName || !officerCanFinishSignIn) {
      setOfficerError(t(uiText.auth.errorMissingScope));
      return;
    }
    signIn(
      { type: 'officer', name: pendingOfficerName, email: pendingOfficerEmail },
      pendingOfficerRole,
      needsState ? officerStateScope : undefined,
      needsDistrict ? officerDistrictScope : undefined,
    );
    navigate(ROLE_DESTINATION[pendingOfficerRole]);
  }

  return (
    <div className="auth-shell">
      <header className="auth-header">
        <a className="brand" href="/" aria-label="BhoomiSetu home">
          <span className="brand-mark" aria-hidden="true">
            BS
          </span>
          <span>
            <span className="brand-title">BhoomiSetu</span>
            <span className="brand-subtitle">Land Acquisition Portal</span>
          </span>
        </a>
        <div className="auth-header-actions">
          <LanguagePicker />
          <button
            className="nav-link lang-toggle theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-container">
          <h1 className="auth-title">{t(uiText.auth.pageTitle)}</h1>

          <Card>
            <div className="auth-quick-login">
              <p className="auth-quick-login-title">{t(uiText.auth.quickLoginTitle)}</p>
              <div className="auth-quick-login-buttons">
                <Button type="button" variant="secondary" onClick={handleDemoCitizenLogin}>
                  {t(uiText.auth.demoCitizenButton)}
                </Button>
                <Button type="button" variant="secondary" onClick={handleDemoOfficerLogin}>
                  {t(uiText.auth.demoOfficerButton)}
                </Button>
              </div>
              <p className="auth-quick-login-note">{t(uiText.auth.quickLoginNote)}</p>
            </div>
          </Card>

          <div className="auth-tabs" role="tablist" aria-label="Sign-in method">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'landowner'}
              className={activeTab === 'landowner' ? 'auth-tab-btn active' : 'auth-tab-btn'}
              onClick={() => setActiveTab('landowner')}
            >
              {t(uiText.auth.landownerTab)}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'officer'}
              className={activeTab === 'officer' ? 'auth-tab-btn active' : 'auth-tab-btn'}
              onClick={() => setActiveTab('officer')}
            >
              {t(uiText.auth.officerTab)}
            </button>
          </div>

          <Card>
            {activeTab === 'landowner' && (
              <div className="auth-form">
                {!otpSent && (
                  <form onSubmit={handleSendOtp} className="auth-form">
                    <label className="field" htmlFor="auth-phone">
                      <span>{t(uiText.auth.phoneLabel)}</span>
                      <input
                        id="auth-phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder={t(uiText.auth.phonePlaceholder)}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                      />
                      <small>+91</small>
                    </label>
                    {citizenError && <p className="auth-error">{citizenError}</p>}
                    <Button type="submit">{t(uiText.auth.sendOtpButton)}</Button>
                  </form>
                )}

                {otpSent && (
                  <form onSubmit={handleVerifyOtp} className="auth-form">
                    <p className="auth-otp-sent-note">
                      {t(uiText.auth.otpSentNote)} +91 {normalizePhoneDigits(phone)}
                    </p>
                    {demoOtpCode && (
                      <p className="auth-otp-demo-code" role="status">
                        {t(uiText.auth.otpDemoCodePrefix)} <strong>{demoOtpCode}</strong>
                      </p>
                    )}
                    <label className="field" htmlFor="auth-otp">
                      <span>{t(uiText.auth.otpLabel)}</span>
                      <input
                        id="auth-otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        className="auth-otp-input"
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                      />
                    </label>
                    {citizenError && <p className="auth-error">{citizenError}</p>}
                    <div className="auth-form-actions">
                      <Button type="submit" disabled={otp.length !== 6 || isVerifyingOtp}>
                        {t(uiText.auth.verifyOtpButton)}
                      </Button>
                      <Button type="button" variant="ghost" onClick={handleChangeNumber}>
                        {t(uiText.auth.changeNumberButton)}
                      </Button>
                    </div>
                    <p className="auth-otp-resend">
                      {resendSecondsLeft > 0 ? (
                        <span>
                          {t(uiText.auth.resendOtpCountdown)} {resendSecondsLeft}s
                        </span>
                      ) : (
                        <button type="button" className="auth-link-btn" onClick={handleResendOtp}>
                          {t(uiText.auth.resendOtpButton)}
                        </button>
                      )}
                    </p>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'officer' && (
              <div className="auth-form">
                {!pendingOfficerRole && (
                  <form onSubmit={handleOfficerCredentials} className="auth-form">
                    <label className="field" htmlFor="auth-email">
                      <span>{t(uiText.auth.emailLabel)}</span>
                      <input
                        id="auth-email"
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </label>
                    <label className="field" htmlFor="auth-password">
                      <span>{t(uiText.auth.passwordLabel)}</span>
                      <input
                        id="auth-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </label>
                    {officerError && <p className="auth-error">{officerError}</p>}
                    <Button type="submit" disabled={isSigningInOfficer}>
                      {t(uiText.auth.signInButton)}
                    </Button>
                  </form>
                )}

                {pendingOfficerRole && (needsState || needsDistrict) && (
                  <div className="auth-form">
                    <p className="auth-otp-sent-note">{pendingOfficerName}</p>
                    {needsState && (
                      <label className="field" htmlFor="auth-state-scope">
                        <span>{t(uiText.auth.stateLabel)}</span>
                        <select
                          id="auth-state-scope"
                          value={officerStateScope ?? ''}
                          onChange={(event) => {
                            setOfficerStateScope((event.target.value || undefined) as StateName | undefined);
                            setOfficerDistrictScope(undefined);
                          }}
                        >
                          <option value="">{t(uiText.auth.stateSelectPlaceholder)}</option>
                          {stateOptions.map((state) => (
                            <option key={state} value={state}>
                              {STATE_NAME_LABELS[state]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {needsDistrict && officerStateScope && (
                      <label className="field" htmlFor="auth-district-scope">
                        <span>{t(uiText.auth.districtLabel)}</span>
                        <select
                          id="auth-district-scope"
                          value={officerDistrictScope ?? ''}
                          onChange={(event) => setOfficerDistrictScope(event.target.value || undefined)}
                        >
                          <option value="">{t(uiText.auth.districtSelectPlaceholder)}</option>
                          {districtOptions.map((district) => (
                            <option key={district} value={district}>
                              {district}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {officerError && <p className="auth-error">{officerError}</p>}
                    <div className="auth-form-actions">
                      <Button type="button" disabled={!officerCanFinishSignIn} onClick={handleFinishOfficerSignIn}>
                        {t(uiText.auth.signInButton)}
                      </Button>
                      <Button type="button" variant="ghost" onClick={resetOfficerScopeStep}>
                        {t(uiText.auth.changeNumberButton)}
                      </Button>
                    </div>
                  </div>
                )}

                {pendingOfficerRole && !needsState && !needsDistrict && (
                  <div className="auth-form">
                    <p className="auth-otp-sent-note">{pendingOfficerName}</p>
                    <Button type="button" onClick={handleFinishOfficerSignIn}>
                      {t(uiText.auth.signInButton)}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
