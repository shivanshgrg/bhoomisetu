import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEMO_OFFICERS,
  requestOtp,
  verifyOfficerCredentials,
  verifyOtp,
} from '../auth/authRepository';
import { LanguagePicker } from '../components/LanguagePicker';
import { Button, Card } from '../components/ui';
import { type AppRole } from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { useSession } from '../i18n/SessionContext';
import { uiText } from '../i18n/translations';
import { useTheme } from '../theme/ThemeContext';

const ROLE_DESTINATION: Record<AppRole, string> = {
  national_admin: '/official/national',
  state_authority: '/official',
  district_officer: '/official',
  field_officer: '/official',
  landowner: '/landowner',
};

const OTP_RESEND_SECONDS = 60;

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(-10);
}

export function AuthPage() {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { signIn } = useSession();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'landowner' | 'officer'>('landowner');
  const [showRoleChooser, setShowRoleChooser] = useState(true);

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
  const [selectedAccessRole, setSelectedAccessRole] = useState<AppRole | undefined>(undefined);
  const [selectedOfficerEmail, setSelectedOfficerEmail] = useState<string | undefined>(undefined);
  const [officerError, setOfficerError] = useState<string | undefined>(undefined);
  const [isSigningInOfficer, setIsSigningInOfficer] = useState(false);

  const resendTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

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
        const selectedOfficer = DEMO_OFFICERS.find((officer) => officer.email === selectedOfficerEmail);
        if (!selectedOfficer || selectedOfficer.email !== user.email) {
          throw new Error('selected_officer_mismatch');
        }
        // Demo accounts have deliberately fixed jurisdiction, so the evaluator
        // selects a role once and enters directly into the correctly scoped view.
        const stateScope = appRole === 'national_admin' ? undefined : 'maharashtra';
        const districtScope = appRole === 'district_officer' || appRole === 'field_officer' ? 'Pune' : undefined;
        signIn(user, appRole, stateScope, districtScope);
        navigate(ROLE_DESTINATION[appRole]);
      })
      .catch(() => {
        setOfficerError(t(uiText.auth.errorInvalidCredentials));
      })
      .finally(() => {
        setIsSigningInOfficer(false);
      });
  }

  function chooseAccessRole(role: AppRole) {
    setShowRoleChooser(false);
    setSelectedAccessRole(role);
    const matches = DEMO_OFFICERS.filter((officer) => officer.appRole === role);
    // Each administrative level has one evaluator account. Field Officer is
    // deliberately one role, not a confusing list of stage-specific jobs.
    setSelectedOfficerEmail(matches[0]?.email);
    setEmail('');
    setPassword('');
    setOfficerError(undefined);
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
          <h1 className="auth-title">{showRoleChooser ? t(uiText.auth.demoPersonaTitle) : t(uiText.auth.pageTitle)}</h1>

          {showRoleChooser ? (
            <Card>
              <p className="auth-quick-login-title">{t(uiText.auth.demoPersonaStep)}</p>
              <p className="auth-role-intro">{t(uiText.auth.demoPersonaDescription)}</p>
              <div className="auth-access-options auth-role-chooser">
                {(['national_admin', 'state_authority', 'district_officer', 'field_officer'] as AppRole[]).map((role) => (
                  <button key={role} type="button" className="auth-access-option" onClick={() => { setActiveTab('officer'); chooseAccessRole(role); }}><span aria-hidden="true">◆</span><strong>{t(uiText.auth.accessRoleLabels[role])}</strong></button>
                ))}
                <button type="button" className="auth-access-option auth-landowner-choice" onClick={() => { setActiveTab('landowner'); setShowRoleChooser(false); }}><span aria-hidden="true">⌂</span><strong>{t(uiText.auth.landownerTab)}</strong></button>
              </div>
            </Card>
          ) : <>
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
                <p className="auth-quick-login-title">{t(uiText.auth.chooseAccessLevelTitle)}</p>
                <div className="auth-access-options" aria-label={t(uiText.auth.chooseAccessLevelTitle)}>
                  {(['national_admin', 'state_authority', 'district_officer', 'field_officer'] as AppRole[]).map((role) => (
                    <button
                      className={selectedAccessRole === role ? 'auth-access-option active' : 'auth-access-option'}
                      key={role}
                      type="button"
                      onClick={() => chooseAccessRole(role)}
                    >
                      <strong>{t(uiText.auth.accessRoleLabels[role])}</strong>
                      <span>{t(uiText.auth.accessRoleDescriptions[role])}</span>
                    </button>
                  ))}
                </div>
                {selectedOfficerEmail && (
                  (() => {
                    const officer = DEMO_OFFICERS.find((entry) => entry.email === selectedOfficerEmail);
                    return officer && <>
                    <div className="auth-selected-authority"><strong>{t(uiText.auth.accessRoleLabels[selectedAccessRole!])}</strong><span>{officer.email}</span><small>{t(uiText.auth.demoPasswordLabel)} {officer.password}</small></div>
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
                    </>;
                  })()
                )}
              </div>
            )}
          </Card>
          <Button type="button" variant="ghost" onClick={() => setShowRoleChooser(true)}>{t(uiText.auth.backToPersonas)}</Button>
          </>}
        </div>
      </main>
    </div>
  );
}
