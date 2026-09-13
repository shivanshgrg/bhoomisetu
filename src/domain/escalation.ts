import { DEMO_REFERENCE_DATE, type AppRole } from './constants';
import { getDaysInCurrentStage, getStageDefinition } from './rules';
import type { AcquisitionParcel, ISODateString } from './types';

// Field Officer -> District Officer -> State Authority -> Ministry, keyed by
// how many days a parcel's current stage has run *past* its own SLA
// threshold (not raw days-in-stage — a parcel still inside its SLA window
// never escalates past the field officer, no matter how old the parcel is).
export const ESCALATION_LEVELS = ['field_officer', 'district_officer', 'state_authority', 'ministry'] as const;
export type EscalationLevel = (typeof ESCALATION_LEVELS)[number];

export const ESCALATION_LEVEL_LABELS: Record<EscalationLevel, string> = {
  field_officer: 'Field Officer',
  district_officer: 'District Officer',
  state_authority: 'State Authority',
  ministry: 'Ministry',
};

// The AppRole a viewer signs in as that corresponds to each escalation
// level, used for the "escalated to me" filter. Ministry has no dedicated
// app role in this prototype (Step 17's role list stops at national_admin),
// so it maps to the national admin view — the highest role that exists.
export const ESCALATION_LEVEL_TO_APP_ROLE: Record<EscalationLevel, AppRole> = {
  field_officer: 'field_officer',
  district_officer: 'district_officer',
  state_authority: 'state_authority',
  ministry: 'national_admin',
};

// Days past SLA at which each level takes over. A parcel within its SLA
// (daysPastSla <= 0) always sits at field_officer — escalation is purely a
// function of lateness, not of stage or role.
const ESCALATION_THRESHOLDS: { level: EscalationLevel; minDaysPastSla: number }[] = [
  { level: 'ministry', minDaysPastSla: 31 },
  { level: 'state_authority', minDaysPastSla: 16 },
  { level: 'district_officer', minDaysPastSla: 1 },
  { level: 'field_officer', minDaysPastSla: -Infinity },
];

export type EscalationStatus = {
  level: EscalationLevel;
  daysPastSla: number;
};

export function getEscalationStatus(
  parcel: AcquisitionParcel,
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): EscalationStatus {
  const stage = getStageDefinition(parcel.currentStage);
  const daysInStage = getDaysInCurrentStage(parcel, asOfDate);
  const daysPastSla = daysInStage - stage.thresholdDays;

  const match = ESCALATION_THRESHOLDS.find((threshold) => daysPastSla >= threshold.minDaysPastSla);

  return {
    level: match?.level ?? 'field_officer',
    daysPastSla: Math.max(0, daysPastSla),
  };
}

export function isEscalatedToRole(parcel: AcquisitionParcel, appRole: AppRole, asOfDate?: ISODateString): boolean {
  const { level } = getEscalationStatus(parcel, asOfDate);
  return ESCALATION_LEVEL_TO_APP_ROLE[level] === appRole;
}
