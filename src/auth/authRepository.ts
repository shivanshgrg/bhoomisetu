import type { AppRole, OfficialRole } from '../domain';
import { OFFICIAL_ROLE_LABELS } from '../domain';

// Step 62 Part A: local-only mock authentication. There is no Firebase
// project, no Supabase Auth, and no SMS gateway behind any of this — citizen
// OTP generates a random 6-digit code per request and holds it in memory
// (see pendingOtpByPhone below), and officer credentials are checked against
// the fixed list in DEMO_OFFICERS. Because there is nowhere to actually
// deliver the code to, requestOtp() hands it back to the caller so the UI
// can display it directly (clearly labeled as a demo-mode code, not a real
// SMS) — see AuthPage.tsx. Swapping in real OTP delivery / Supabase Auth
// later only needs to replace the bodies of the four functions below; every
// caller already goes through this module.
export type AuthedUser = {
  type: 'citizen' | 'officer';
  name: string;
  phone?: string;
  email?: string;
  officialRole?: OfficialRole;
};

// Keyed by phone number so a resend simply overwrites the previous pending
// code; nothing here persists across a page reload, matching the rest of
// this module's "in-memory only" mock scope.
const pendingOtpByPhone = new Map<string, string>();

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Tied to hero parcel 124/7's owner (src/domain/demoData.ts heroSeeds) so the
// citizen quick-login button lands on the exact parcel every demo walkthrough
// already centers on.
export const DEMO_CITIZEN_PROFILE: AuthedUser = {
  type: 'citizen',
  name: 'Kavita Patil',
  phone: '+919876501001',
};

type DemoOfficer = {
  email: string;
  password: string;
  name: string;
  officialRole: OfficialRole;
  appRole: AppRole;
};

// One fixed demo account per OfficialRole (job title), each mapped to the
// AppRole (permission tier) that actually drives routing/session scoping.
// district_collector/land_acquisition_officer carry district_officer (state +
// district scope required); survey_officer/valuation_officer carry
// field_officer (same scope requirement); compensation_officer carries
// state_authority (state scope only) since compensation approval sits above
// a single district in this prototype's role model.
export const DEMO_OFFICERS: DemoOfficer[] = [
  {
    email: 'district.collector@gov.in',
    password: 'collector@123',
    name: OFFICIAL_ROLE_LABELS.district_collector,
    officialRole: 'district_collector',
    appRole: 'district_officer',
  },
  {
    email: 'land.acquisition@gov.in',
    password: 'acquisition@123',
    name: OFFICIAL_ROLE_LABELS.land_acquisition_officer,
    officialRole: 'land_acquisition_officer',
    appRole: 'district_officer',
  },
  {
    email: 'survey.officer@gov.in',
    password: 'survey@123',
    name: OFFICIAL_ROLE_LABELS.survey_officer,
    officialRole: 'survey_officer',
    appRole: 'field_officer',
  },
  {
    email: 'valuation.officer@gov.in',
    password: 'valuation@123',
    name: OFFICIAL_ROLE_LABELS.valuation_officer,
    officialRole: 'valuation_officer',
    appRole: 'field_officer',
  },
  {
    email: 'compensation.officer@gov.in',
    password: 'compensation@123',
    name: OFFICIAL_ROLE_LABELS.compensation_officer,
    officialRole: 'compensation_officer',
    appRole: 'state_authority',
  },
];

// District Collector, pre-scoped to Maharashtra / Pune (hero parcel 124/7's
// own district) so the 1-click evaluator button can sign in instantly
// without also making the evaluator pick a state/district.
export const DEMO_OFFICER_PROFILE: AuthedUser = {
  type: 'officer',
  name: DEMO_OFFICERS[0].name,
  email: DEMO_OFFICERS[0].email,
  officialRole: DEMO_OFFICERS[0].officialRole,
};

export function requestOtp(phone: string): Promise<{ code: string }> {
  // Mock send — no SMS provider. A fresh random code is generated and
  // returned directly to the caller (instead of being "sent" anywhere),
  // since there is no delivery channel to send it through.
  const code = generateOtpCode();
  pendingOtpByPhone.set(phone, code);
  return Promise.resolve({ code });
}

export function verifyOtp(phone: string, code: string): Promise<AuthedUser> {
  const expectedCode = pendingOtpByPhone.get(phone);
  if (!expectedCode || code !== expectedCode) {
    return Promise.reject(new Error('invalid_otp'));
  }
  pendingOtpByPhone.delete(phone);
  return Promise.resolve({ ...DEMO_CITIZEN_PROFILE, phone });
}

export function verifyOfficerCredentials(
  email: string,
  password: string,
): Promise<{ user: AuthedUser; appRole: AppRole }> {
  const normalizedEmail = email.trim().toLowerCase();
  const match = DEMO_OFFICERS.find(
    (officer) => officer.email.toLowerCase() === normalizedEmail && officer.password === password,
  );
  if (!match) {
    return Promise.reject(new Error('invalid_credentials'));
  }
  return Promise.resolve({
    user: { type: 'officer', name: match.name, email: match.email, officialRole: match.officialRole },
    appRole: match.appRole,
  });
}
