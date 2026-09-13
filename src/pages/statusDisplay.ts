import {
  PROJECT_STATUS_LABELS,
  type AdvanceGate,
  type DashboardStatus,
  type DocumentCheckSignalStatus,
  type DocumentStatus,
  type EscalationLevel,
  type LapseRisk,
  type LapseStatus,
  type ParcelCalculatedStatus,
  type ProjectStatus,
  type RiskLevel,
  type StageId,
} from '../domain';
import { documentKindLabels, uiText, type TranslationEntry } from '../i18n/translations';

export function getPaginationSummary(
  totalCount: number,
  page: number,
  pageSize: number,
  t: (entry: TranslationEntry) => string,
): string {
  if (totalCount === 0) {
    return `0 ${t(uiText.pagination.ofWord)} 0`;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  return `${t(uiText.pagination.showingPrefix)} ${from}${to > from ? ` ${t(uiText.pagination.showingToWord)} ${to}` : ''} ${t(
    uiText.pagination.ofWord,
  )} ${totalCount}`;
}

export function getPaginationPageLabel(page: number, pageCount: number, t: (entry: TranslationEntry) => string): string {
  return `${t(uiText.pagination.pagePrefix)} ${page} ${t(uiText.pagination.ofWord)} ${pageCount}`;
}

export function getBadgeTone(status: DashboardStatus) {
  if (status === 'stuck') {
    return 'warning';
  }

  if (status === 'blocked') {
    return 'danger';
  }

  if (status === 'complete') {
    return 'success';
  }

  return 'info';
}

export function getStatusLabel(status: DashboardStatus) {
  switch (status) {
    case 'stuck':
      return 'Stuck';
    case 'blocked':
      return 'Blocked';
    case 'complete':
      return 'Complete';
    case 'ready_to_advance':
      return 'Ready to advance';
    default:
      return 'On track';
  }
}

export function getStatusIcon(status: DashboardStatus) {
  switch (status) {
    case 'stuck':
      return '⚠️';
    case 'blocked':
      return '⛔';
    case 'complete':
      return '✅';
    case 'ready_to_advance':
      return '➡️';
    default:
      return '🟢';
  }
}

export function getProjectStatusTone(status: ProjectStatus) {
  if (status === 'at_risk') {
    return 'warning';
  }

  if (status === 'delayed') {
    return 'danger';
  }

  if (status === 'complete') {
    return 'success';
  }

  return 'info';
}

export function getProjectStatusLabel(status: ProjectStatus) {
  return PROJECT_STATUS_LABELS[status];
}

export function getProjectStatusIcon(status: ProjectStatus) {
  switch (status) {
    case 'at_risk':
      return '⚠️';
    case 'delayed':
      return '⛔';
    case 'complete':
      return '✅';
    default:
      return '🟢';
  }
}

export function getDocumentStatusTone(status: DocumentStatus) {
  if (status === 'verified') {
    return 'success';
  }

  if (status === 'rejected') {
    return 'danger';
  }

  return 'warning';
}

// Reconstructs getAdvanceGate()'s English reason sentence (src/domain/rules.ts)
// from structured fields instead of displaying it directly, so official-side
// pages can show it bilingually — the same approach LandownerStatusPage.tsx's
// "actionRequired" text uses for the equivalent landowner-facing string.
export function getAdvanceGateReasonText(
  currentStage: StageId,
  calculatedStatus: ParcelCalculatedStatus,
  advanceGate: AdvanceGate,
  t: (entry: TranslationEntry) => string,
): string {
  if (advanceGate.toStage === undefined) {
    return t(uiText.parcelDetail.workflowCompleteDescription);
  }

  if (calculatedStatus.missingDocumentKinds.length > 0) {
    const missingDocuments = calculatedStatus.missingDocumentKinds.map((kind) => t(documentKindLabels[kind])).join(', ');
    return `${t(uiText.landownerStatus.actionRequiredMissingDocumentPrefix)} ${missingDocuments}.`;
  }

  if (currentStage === 'objection_review' && calculatedStatus.openObjectionCount > 0) {
    return t(uiText.landownerStatus.actionRequiredOpenObjections);
  }

  return t(uiText.parcelDetail.workflowCompleteDescription);
}

export function getSignalTone(status: DocumentCheckSignalStatus) {
  if (status === 'fail') {
    return 'danger';
  }

  if (status === 'warning') {
    return 'warning';
  }

  if (status === 'pass') {
    return 'success';
  }

  return 'neutral';
}

export function getEscalationTone(level: EscalationLevel) {
  if (level === 'ministry') {
    return 'danger';
  }

  if (level === 'state_authority') {
    return 'warning';
  }

  if (level === 'district_officer') {
    return 'info';
  }

  return 'neutral';
}

export function getLapseRiskTone(risk: LapseRisk) {
  if (risk === 'lapsed') {
    return 'danger';
  }

  if (risk === 'approaching') {
    return 'warning';
  }

  return 'success';
}

export function getLapseRiskIcon(risk: LapseRisk) {
  if (risk === 'lapsed') {
    return '⛔';
  }

  if (risk === 'approaching') {
    return '⏳';
  }

  return '✅';
}

// Total statutory window per statute (Section 19: 365 days, Section 24: 5
// years) — used only to turn LapseStatus's daysRemaining back into an
// approximate "months of process" figure for the kill-shot banner text,
// without adding a derived field to the domain type itself.
const LAPSE_WINDOW_DAYS: Record<LapseStatus['statute'], number> = {
  section_19: 365,
  section_24: 365 * 5,
  none: 0,
};

export function getLapseMonthsElapsed(lapseStatus: LapseStatus): number {
  const daysElapsed = LAPSE_WINDOW_DAYS[lapseStatus.statute] - lapseStatus.daysRemaining;
  return Math.max(0, Math.round(daysElapsed / 30));
}

export function getRiskTone(level: RiskLevel) {
  if (level === 'critical') {
    return 'danger';
  }

  if (level === 'high') {
    return 'warning';
  }

  if (level === 'medium') {
    return 'info';
  }

  return 'success';
}
