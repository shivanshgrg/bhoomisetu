// Step 63: statutory lapse clock (LARR 2013 Section 19(1) / Section 24(2)).
//
// Every status this app already computes (stuck/blocked/SLA breach) answers
// an operational question — how slow is this parcel? This module answers a
// different, legal one: does the government still have the right to take
// this land at all? Section 19(1) voids the whole notification if no award
// is made within 12 months of the Section 19 declaration; Section 24(2)
// separately voids an acquisition where an award was made 5+ years ago but
// compensation remains unpaid or possession untaken. Pure and deterministic
// — same parcel + asOfDate in, same result out, like rules.ts and risk.ts.
import { DEMO_REFERENCE_DATE } from './constants';
import { addDays, daysBetween } from './rules';
import type { AcquisitionParcel, ISODateString } from './types';

const SECTION_19_LAPSE_DAYS = 365;
const SECTION_19_APPROACHING_DAYS = SECTION_19_LAPSE_DAYS - 60;
const SECTION_24_LAPSE_DAYS = 365 * 5;
const SECTION_24_APPROACHING_DAYS = SECTION_24_LAPSE_DAYS - 60;

export type LapseStatute = 'section_19' | 'section_24' | 'none';
export type LapseRisk = 'safe' | 'approaching' | 'lapsed';

export type LapseStatus = {
  statute: LapseStatute;
  risk: LapseRisk;
  daysRemaining: number;
  deadlineOn: ISODateString;
  reasonText: string;
};

function getAwardDate(parcel: AcquisitionParcel): ISODateString | undefined {
  return parcel.history.find((entry) => entry.stage === 'award')?.enteredOn;
}

function getPossessionTaken(parcel: AcquisitionParcel): boolean {
  return parcel.history.some((entry) => entry.stage === 'possession');
}

function getSection19Status(parcel: AcquisitionParcel, asOfDate: ISODateString): LapseStatus {
  const daysSinceDeclaration = daysBetween(parcel.declarationOn, asOfDate);
  const deadlineOn = addDays(parcel.declarationOn, SECTION_19_LAPSE_DAYS);
  const daysRemaining = SECTION_19_LAPSE_DAYS - daysSinceDeclaration;

  if (daysSinceDeclaration > SECTION_19_LAPSE_DAYS) {
    return {
      statute: 'section_19',
      risk: 'lapsed',
      daysRemaining,
      deadlineOn,
      reasonText: `Section 19 declaration was made ${daysSinceDeclaration} days ago and no award has been issued; the notification lapsed under Section 19(1) after the 365-day limit (${Math.abs(daysRemaining)} days ago).`,
    };
  }

  if (daysSinceDeclaration > SECTION_19_APPROACHING_DAYS) {
    return {
      statute: 'section_19',
      risk: 'approaching',
      daysRemaining,
      deadlineOn,
      reasonText: `Award not yet made; declaration was ${daysSinceDeclaration} days ago. Section 19(1) voids the notification in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} unless the award is issued first.`,
    };
  }

  return {
    statute: 'none',
    risk: 'safe',
    daysRemaining,
    deadlineOn,
    reasonText: `Award not yet made; declaration was ${daysSinceDeclaration} days ago, within the Section 19(1) 12-month window.`,
  };
}

function getSection24Status(parcel: AcquisitionParcel, awardDate: ISODateString, asOfDate: ISODateString): LapseStatus {
  const daysSinceAward = daysBetween(awardDate, asOfDate);
  const deadlineOn = addDays(awardDate, SECTION_24_LAPSE_DAYS);
  const daysRemaining = SECTION_24_LAPSE_DAYS - daysSinceAward;
  const compensationOutstanding = parcel.compensationPaid < parcel.compensationEstimate;
  const possessionTaken = getPossessionTaken(parcel);

  if (!compensationOutstanding && possessionTaken) {
    return {
      statute: 'none',
      risk: 'safe',
      daysRemaining,
      deadlineOn,
      reasonText: 'Award made; compensation paid in full and possession taken — Section 24(2) does not apply.',
    };
  }

  if (daysSinceAward > SECTION_24_LAPSE_DAYS) {
    return {
      statute: 'section_24',
      risk: 'lapsed',
      daysRemaining,
      deadlineOn,
      reasonText: `Award was made ${daysSinceAward} days ago; compensation remains unpaid or possession has not been taken. The acquisition lapsed under Section 24(2) after the 5-year limit (${Math.abs(daysRemaining)} days ago).`,
    };
  }

  if (daysSinceAward > SECTION_24_APPROACHING_DAYS) {
    return {
      statute: 'section_24',
      risk: 'approaching',
      daysRemaining,
      deadlineOn,
      reasonText: `Award was made ${daysSinceAward} days ago; compensation remains unpaid or possession has not been taken. Section 24(2) voids the acquisition in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} unless resolved.`,
    };
  }

  return {
    statute: 'none',
    risk: 'safe',
    daysRemaining,
    deadlineOn,
    reasonText: `Award was made ${daysSinceAward} days ago, within the Section 24(2) 5-year window.`,
  };
}

export function getLapseStatus(
  parcel: AcquisitionParcel,
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): LapseStatus {
  const awardDate = getAwardDate(parcel);

  if (!awardDate) {
    return getSection19Status(parcel, asOfDate);
  }

  return getSection24Status(parcel, awardDate, asOfDate);
}
